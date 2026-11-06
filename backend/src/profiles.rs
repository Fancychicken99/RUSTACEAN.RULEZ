//! Validated, atomic profile workflows. SQL and transaction ownership stay here.
use crate::database::{
    Contractor, Organization, add_contractor, archive_contractor, get_contractor, get_organizations,
};
use rusqlite::{Connection, params};
use std::fmt;

pub const MAX_SAFE_ID: i64 = 9_007_199_254_740_991;

#[derive(Debug)]
pub enum ProfileError {
    InvalidInput(String),
    NotFound(&'static str),
    Database(rusqlite::Error),
}

impl fmt::Display for ProfileError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput(message) => f.write_str(message),
            Self::NotFound(message) => f.write_str(message),
            Self::Database(_) => f.write_str("Database operation failed"),
        }
    }
}
impl std::error::Error for ProfileError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Database(error) => Some(error),
            _ => None,
        }
    }
}
impl From<rusqlite::Error> for ProfileError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProfileFields {
    #[serde(default)]
    pub full_name: String,
    pub prefix: Option<String>,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub suffix: Option<String>,
    pub role: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    #[serde(default)]
    pub extra_information: serde_json::Value,
}

pub fn validate_id(id: i64) -> Result<(), ProfileError> {
    if !(1..=MAX_SAFE_ID).contains(&id) {
        return Err(ProfileError::InvalidInput(
            "Record ID must be a positive safe integer".into(),
        ));
    }
    Ok(())
}

fn text(
    value: String,
    label: &str,
    limit: usize,
    required: bool,
) -> Result<Option<String>, ProfileError> {
    let value = value.trim();
    if value.is_empty() {
        return if required {
            Err(ProfileError::InvalidInput(format!("{label} is required")))
        } else {
            Ok(None)
        };
    }
    if value.chars().count() > limit || value.chars().any(char::is_control) {
        return Err(ProfileError::InvalidInput(format!(
            "{label} must be at most {limit} characters with no control characters"
        )));
    }
    Ok(Some(value.to_owned()))
}

impl ProfileFields {
    pub(crate) fn validated(self) -> Result<Self, ProfileError> {
        let prefix = text(self.prefix.unwrap_or_default(), "Prefix", 20, false)?;
        let first_name = text(
            self.first_name.unwrap_or_default(),
            "First name",
            100,
            false,
        )?;
        let middle_name = text(
            self.middle_name.unwrap_or_default(),
            "Middle name",
            150,
            false,
        )?;
        let last_name = text(self.last_name.unwrap_or_default(), "Last name", 100, false)?;
        let suffix = text(self.suffix.unwrap_or_default(), "Suffix", 20, false)?;

        let has_split_name = first_name.is_some() || last_name.is_some();

        let full_name = if has_split_name {
            if first_name.is_none() || last_name.is_none() {
                return Err(ProfileError::InvalidInput(
                    "First and last name are required".into(),
                ));
            }

            let parts = [
                prefix.as_deref(),
                first_name.as_deref(),
                middle_name.as_deref(),
                last_name.as_deref(),
                suffix.as_deref(),
            ];

            let combined = parts.into_iter().flatten().collect::<Vec<_>>().join(" ");

            text(combined, "Full name", 200, true)?.unwrap()
        } else {
            text(self.full_name, "Full name", 200, true)?.unwrap()
        };
        let role = text(self.role.unwrap_or_default(), "Role", 120, false)?;
        let email = text(self.email.unwrap_or_default(), "Email", 254, false)?;
        let phone = text(self.phone.unwrap_or_default(), "Phone", 80, false)?;
        let extra_information = validate_extra_information(self.extra_information)?;
        if let Some(email) = &email {
            let parts: Vec<_> = email.split('@').collect();
            if parts.len() != 2
                || parts[0].is_empty()
                || parts[1].is_empty()
                || !parts[1].contains('.')
                || parts[1].starts_with('.')
                || parts[1].ends_with('.')
                || email.chars().any(char::is_whitespace)
            {
                return Err(ProfileError::InvalidInput(
                    "Enter an email such as name@example.com".into(),
                ));
            }
        }
        Ok(Self {
            full_name,
            prefix,
            first_name,
            middle_name,
            last_name,
            suffix,
            role,
            email,
            phone,
            extra_information,
        })
    }
}

fn validate_extra_information(value: serde_json::Value) -> Result<serde_json::Value, ProfileError> {
    let Some(fields) = value.as_object() else {
        if value.is_null() { return Ok(serde_json::json!({})); }
        return Err(ProfileError::InvalidInput("Additional information must be an object".into()));
    };
    if fields.len() > 100 { return Err(ProfileError::InvalidInput("At most 100 additional fields are allowed".into())); }
    for (name, field) in fields {
        if name.trim().is_empty() || name.chars().count() > 100 || name.chars().any(char::is_control) {
            return Err(ProfileError::InvalidInput("Additional field names must be 1 to 100 characters".into()));
        }
        let Some(kind) = field.get("type").and_then(serde_json::Value::as_str) else { return Err(ProfileError::InvalidInput(format!("Additional field '{name}' has no valid type"))); };
        match kind {
            "text" | "long_text" => {
                if field.get("value").and_then(serde_json::Value::as_str).is_none_or(|v| v.chars().count() > 10_000) {
                    return Err(ProfileError::InvalidInput(format!("Additional field '{name}' must have text no longer than 10000 characters")));
                }
            }
            "relation" => {
                let entity = field.get("entity_type").and_then(serde_json::Value::as_str);
                let id = field.get("entity_id").and_then(serde_json::Value::as_i64);
                if !matches!(entity, Some("contractor" | "organization")) || id.is_none_or(|id| id < 1) {
                    return Err(ProfileError::InvalidInput(format!("Additional relation '{name}' needs a valid record")));
                }
            }
            _ => return Err(ProfileError::InvalidInput(format!("Additional field '{name}' has an unsupported type"))),
        }
    }
    Ok(value)
}

pub fn create_profile(
    conn: &mut Connection,
    organization_id: i64,
    profile: ProfileFields,
) -> Result<Contractor, ProfileError> {
    validate_id(organization_id)?;
    let profile = profile.validated()?;
    let tx = conn.transaction()?;
    let active: bool = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM organizations WHERE id = ?1 AND archived_at IS NULL)",
        [organization_id],
        |row| row.get(0),
    )?;
    if !active {
        return Err(ProfileError::NotFound("Organization not found or archived"));
    }
    let id = add_contractor(&tx, &profile.full_name, organization_id)?;
    validate_id(id)?;
    tx.execute(
        "UPDATE contractors
     SET prefix = ?1,
         first_name = ?2,
         middle_name = ?3,
         last_name = ?4,
         suffix = ?5,
         extra_information = ?6,
         created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?7",
        params![
            profile.prefix,
            profile.first_name,
            profile.middle_name,
            profile.last_name,
            profile.suffix,
            profile.extra_information.to_string(),
            id
        ],
    )?;
    tx.execute(
        "UPDATE contractors
     SET role = ?1,
         email = ?2,
         phone = ?3,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?4",
        params![profile.role, profile.email, profile.phone, id,],
    )?;
    let saved = get_contractor(&tx, id)?
        .ok_or(ProfileError::NotFound("Contractor not found or archived"))?;
    tx.commit()?;
    Ok(saved)
}

pub fn update_profile(
    conn: &mut Connection,
    id: i64,
    profile: ProfileFields,
) -> Result<Contractor, ProfileError> {
    validate_id(id)?;
    let profile = profile.validated()?;
    let tx = conn.transaction()?;

    let changed = tx.execute(
        "UPDATE contractors
         SET full_name = ?1,
             role = ?2,
             email = ?3,
             phone = ?4,
             prefix = ?5,
             first_name = ?6,
             middle_name = ?7,
             last_name = ?8,
             suffix = ?9,
             extra_information = ?10,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?11 AND archived_at IS NULL",
        params![
            profile.full_name,
            profile.role,
            profile.email,
            profile.phone,
            profile.prefix,
            profile.first_name,
            profile.middle_name,
            profile.last_name,
            profile.suffix,
            profile.extra_information.to_string(),
            id,
        ],
    )?;

    if changed == 0 {
        return Err(ProfileError::NotFound("Contractor not found or archived"));
    }

    let saved = get_contractor(&tx, id)?
        .ok_or(ProfileError::NotFound("Contractor not found or archived"))?;

    tx.commit()?;
    Ok(saved)
}

pub fn archive_profile(conn: &Connection, id: i64) -> Result<(), ProfileError> {
    validate_id(id)?;
    if !archive_contractor(conn, id)? {
        return Err(ProfileError::NotFound("Contractor not found or archived"));
    }
    Ok(())
}

pub fn set_contractor_status(
    conn: &Connection,
    id: i64,
    status: &str,
) -> Result<Contractor, ProfileError> {
    validate_id(id)?;
    if !matches!(status, "Active" | "Inactive" | "Retired" | "Deceased") {
        return Err(ProfileError::InvalidInput(
            "Status must be Active, Inactive, Retired, or Deceased".into(),
        ));
    }
    let changed = conn.execute(
        "UPDATE contractors SET status = ?1,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?2 AND archived_at IS NULL",
        params![status, id],
    )?;
    if changed == 0 {
        return Err(ProfileError::NotFound("Contractor not found or archived"));
    }
    get_contractor(conn, id)?.ok_or(ProfileError::NotFound("Contractor not found or archived"))
}

pub fn create_organization(
    conn: &mut Connection,
    name: String,
    region: Option<String>,
) -> Result<Organization, ProfileError> {
    create_organization_profile(conn, name, region, None, None, None)
}

pub fn create_organization_profile(
    conn: &mut Connection,
    name: String,
    region: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    notes: Option<String>,
) -> Result<Organization, ProfileError> {
    create_organization_profile_complete(
        conn,
        name,
        region,
        phone,
        email,
        notes,
        OrganizationContactFields::default(),
        serde_json::Value::Null,
    )
}

#[derive(Debug, Default, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OrganizationContactFields {
    pub secondary_phone: Option<String>,
    pub secondary_contact: Option<String>,
    pub secondary_email: Option<String>,
    pub street_address_1: Option<String>,
    pub street_address_2: Option<String>,
    pub city: Option<String>,
    pub state_province: Option<String>,
    pub country: Option<String>,
}

pub fn create_organization_profile_complete(
    conn: &mut Connection,
    name: String,
    region: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    notes: Option<String>,
    contact: OrganizationContactFields,
    extra_information: serde_json::Value,
) -> Result<Organization, ProfileError> {
    let name = text(name, "Organization name", 200, true)?.unwrap();
    let region = text(region.unwrap_or_default(), "Region", 120, false)?;
    let email = text(email.unwrap_or_default(), "Email", 254, false)?;

    let phone = text(phone.unwrap_or_default(), "Phone", 80, false)?;

    let notes = text(notes.unwrap_or_default(), "Notes", 5_000, false)?;
    if let Some(phone) = &phone {
        let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();

        if digits.len() < 7 || digits.len() > 15 {
            return Err(ProfileError::InvalidInput(
                "Phone must contain 7 to 15 digits".into(),
            ));
        }

        if !phone
            .chars()
            .all(|c| c.is_ascii_digit() || matches!(c, '+' | '-' | '(' | ')' | ' ' | '.'))
        {
            return Err(ProfileError::InvalidInput(
                "Phone contains invalid characters".into(),
            ));
        }

        if phone.matches('+').count() > 1 || (phone.contains('+') && !phone.starts_with('+')) {
            return Err(ProfileError::InvalidInput(
                "Country code must appear at the beginning".into(),
            ));
        }
    }
    if let Some(email) = &email {
        let parts: Vec<_> = email.split('@').collect();
        if parts.len() != 2
            || parts[0].is_empty()
            || parts[1].is_empty()
            || !parts[1].contains('.')
            || parts[1].starts_with('.')
            || parts[1].ends_with('.')
            || email.chars().any(char::is_whitespace)
        {
            return Err(ProfileError::InvalidInput(
                "Enter an email such as name@example.com".into(),
            ));
        }
    }
    let contact = validate_organization_contact(contact)?;
    let extra_information = validate_extra_information(extra_information)?;
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO organizations (name, region, phone, email, notes,
         secondary_phone, secondary_contact, secondary_email, street_address_1,
         street_address_2, city, state_province, country, extra_information, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
        params![name, region, phone, email, notes, contact.0, contact.1, contact.2, contact.3, contact.4, contact.5, contact.6, contact.7, extra_information.to_string()],
    )?;
    let id = tx.last_insert_rowid();
    validate_id(id)?;
    let saved = get_organizations(&tx)?
        .into_iter()
        .find(|org| org.id == id)
        .ok_or(ProfileError::NotFound("Organization not found"))?;
    tx.commit()?;
    Ok(saved)
}

pub fn update_organization_profile(
    conn: &Connection,
    id: i64,
    name: String,
    region: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    notes: Option<String>,
) -> Result<Organization, ProfileError> {
    update_organization_profile_complete(
        conn,
        id,
        name,
        region,
        phone,
        email,
        notes,
        OrganizationContactFields::default(),
        serde_json::Value::Null,
    )
}

pub fn update_organization_profile_complete(
    conn: &Connection,
    id: i64,
    name: String,
    region: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    notes: Option<String>,
    contact: OrganizationContactFields,
    extra_information: serde_json::Value,
) -> Result<Organization, ProfileError> {
    validate_id(id)?;
    let name = text(name, "Organization name", 200, true)?.unwrap();
    let region = text(region.unwrap_or_default(), "Region", 120, false)?;
    let phone = text(phone.unwrap_or_default(), "Phone", 80, false)?;
    let email = text(email.unwrap_or_default(), "Email", 254, false)?;
    let notes = text(notes.unwrap_or_default(), "Notes", 5_000, false)?;
    let contact = validate_organization_contact(contact)?;
    let extra_information = validate_extra_information(extra_information)?;
    if let Some(email) = &email {
        let parts: Vec<_> = email.split('@').collect();
        if parts.len() != 2
            || parts[0].is_empty()
            || parts[1].is_empty()
            || !parts[1].contains('.')
            || parts[1].starts_with('.')
            || parts[1].ends_with('.')
            || email.chars().any(char::is_whitespace)
        {
            return Err(ProfileError::InvalidInput(
                "Enter an email such as name@example.com".into(),
            ));
        }
    }
    let changed = conn.execute(
        "UPDATE organizations SET name = ?1, region = ?2, phone = ?3, email = ?4, notes = ?5,
         secondary_phone = ?6, secondary_contact = ?7, secondary_email = ?8,
         street_address_1 = ?9, street_address_2 = ?10, city = ?11, state_province = ?12,
         country = ?13, extra_information = ?14, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?15 AND archived_at IS NULL",
        params![
            name,
            region.as_deref(),
            phone,
            email,
            notes,
            contact.0,
            contact.1,
            contact.2,
            contact.3,
            contact.4,
            contact.5,
            contact.6,
            contact.7,
            extra_information.to_string(),
            id
        ],
    )?;
    if changed == 0 {
        return Err(ProfileError::NotFound("Organization not found or archived"));
    }
    get_organizations(conn)?
        .into_iter()
        .find(|org| org.id == id)
        .ok_or(ProfileError::NotFound("Organization not found or archived"))
}

fn validate_organization_contact(
    fields: OrganizationContactFields,
) -> Result<
    (
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ),
    ProfileError,
> {
    let secondary_phone = text(
        fields.secondary_phone.unwrap_or_default(),
        "Secondary phone",
        80,
        false,
    )?;
    let secondary_contact = text(
        fields.secondary_contact.unwrap_or_default(),
        "Secondary contact",
        200,
        false,
    )?;
    let secondary_email = text(
        fields.secondary_email.unwrap_or_default(),
        "Secondary email",
        254,
        false,
    )?;
    if let Some(email) = &secondary_email {
        let parts: Vec<_> = email.split('@').collect();
        if parts.len() != 2
            || parts[0].is_empty()
            || parts[1].is_empty()
            || !parts[1].contains('.')
            || email.chars().any(char::is_whitespace)
        {
            return Err(ProfileError::InvalidInput(
                "Enter a valid secondary email address".into(),
            ));
        }
    }
    let street_address_1 = text(
        fields.street_address_1.unwrap_or_default(),
        "Street address",
        200,
        false,
    )?;
    let street_address_2 = text(
        fields.street_address_2.unwrap_or_default(),
        "Street address 2",
        200,
        false,
    )?;
    let city = text(fields.city.unwrap_or_default(), "City", 100, false)?;
    let state_province = text(
        fields.state_province.unwrap_or_default(),
        "State or province",
        100,
        false,
    )?;
    let country = text(fields.country.unwrap_or_default(), "Country", 100, false)?;
    Ok((
        secondary_phone,
        secondary_contact,
        secondary_email,
        street_address_1,
        street_address_2,
        city,
        state_province,
        country,
    ))
}
pub fn set_organization_status(
    conn: &Connection,
    id: i64,
    status: &str,
) -> Result<Organization, ProfileError> {
    validate_id(id)?;

    if !matches!(status, "Active" | "Inactive" | "Out of Business") {
        return Err(ProfileError::InvalidInput(
            "Status must be Active, Inactive, or Out of Business".into(),
        ));
    }

    let changed = conn.execute(
        "UPDATE organizations
         SET status = CASE WHEN ?1 = 'Out of Business' THEN status ELSE ?1 END,
             out_of_business_at = CASE WHEN ?1 = 'Out of Business' THEN COALESCE(out_of_business_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) ELSE NULL END,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?2 AND archived_at IS NULL",
        params![status, id],
    )?;

    if changed == 0 {
        return Err(ProfileError::NotFound("Organization not found or archived"));
    }

    get_organizations(conn)?
        .into_iter()
        .find(|org| org.id == id)
        .ok_or(ProfileError::NotFound("Organization not found"))
}
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OrganizationExtraFields {
    pub secondary_email: Option<String>,
    pub street_address_1: Option<String>,
    pub street_address_2: Option<String>,
    pub city: Option<String>,
    pub state_province: Option<String>,
    pub country: Option<String>,
}
pub fn update_organization_extra(
    conn: &Connection,
    id: i64,
    fields: OrganizationExtraFields,
) -> Result<Organization, ProfileError> {
    validate_id(id)?;

    let secondary_email = text(
        fields.secondary_email.unwrap_or_default(),
        "Secondary email",
        254,
        false,
    )?;

    let street_address_1 = text(
        fields.street_address_1.unwrap_or_default(),
        "Street address",
        200,
        false,
    )?;

    let street_address_2 = text(
        fields.street_address_2.unwrap_or_default(),
        "Street address 2",
        200,
        false,
    )?;

    let city = text(fields.city.unwrap_or_default(), "City", 100, false)?;

    let state_province = text(
        fields.state_province.unwrap_or_default(),
        "State or province",
        100,
        false,
    )?;

    let country = text(fields.country.unwrap_or_default(), "Country", 100, false)?;

    let changed = conn.execute(
        "UPDATE organizations
         SET secondary_email = ?1,
             street_address_1 = ?2,
             street_address_2 = ?3,
             city = ?4,
             state_province = ?5,
             country = ?6,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?7 AND archived_at IS NULL",
        params![
            secondary_email,
            street_address_1,
            street_address_2,
            city,
            state_province,
            country,
            id,
        ],
    )?;

    if changed == 0 {
        return Err(ProfileError::NotFound("Organization not found or archived"));
    }

    get_organizations(conn)?
        .into_iter()
        .find(|org| org.id == id)
        .ok_or(ProfileError::NotFound("Organization not found"))
}

//! Validated, atomic profile workflows. SQL and transaction ownership stay here.
use crate::database::{
    Contractor, Organization, add_contractor, archive_contractor, get_contractor,
    get_organizations, update_organization_details,
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
    pub details: Option<crate::details::RecordDetails>,
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

pub(crate) fn validate_email(email: &str) -> Result<(), ProfileError> {
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
    Ok(())
}

fn notes_text(value: Option<String>) -> Result<Option<String>, ProfileError> {
    let value = value.unwrap_or_default();
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > 5_000
        || value
            .chars()
            .any(|c| c.is_control() && c != '\n' && c != '\r' && c != '\t')
    {
        return Err(ProfileError::InvalidInput(
            "Notes must be at most 5000 characters without unsupported control characters".into(),
        ));
    }
    Ok(Some(value.replace("\r\n", "\n").replace('\r', "\n")))
}

pub(crate) fn validate_phone(phone: &str) -> Result<(), ProfileError> {
    let digits = phone.chars().filter(char::is_ascii_digit).count();
    let mut depth = 0;
    let valid = phone.chars().enumerate().all(|(index, ch)| match ch {
        '0'..='9' | ' ' | '-' => true,
        '+' => index == 0,
        '(' if depth == 0 => {
            depth = 1;
            true
        }
        ')' if depth == 1 => {
            depth = 0;
            true
        }
        _ => false,
    });
    let country_prefix_ok =
        !phone.starts_with('+') || matches!(phone.as_bytes().get(1), Some(b'1'..=b'9'));
    if !valid || depth != 0 || !(7..=15).contains(&digits) || !country_prefix_ok {
        return Err(ProfileError::InvalidInput(
                    "Enter a phone number with 7 to 15 digits; use an optional leading +, spaces, hyphens or balanced parentheses".into(),
                ));
    }
    Ok(())
}

impl ProfileFields {
    pub(crate) fn validated(self) -> Result<Self, ProfileError> {
        let has_split_name = self.first_name.is_some() || self.last_name.is_some();
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
        if let Some(email) = &email {
            validate_email(email)?;
        }
        if email.is_none() && phone.is_none() {
            return Err(ProfileError::InvalidInput(
                "Enter a phone number or email address".into(),
            ));
        }
        if let Some(phone) = &phone {
            validate_phone(phone)?;
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
            details: self.details,
        })
    }
}

pub fn create_profile(
    conn: &mut Connection,
    organization_id: i64,
    profile: ProfileFields,
) -> Result<Contractor, ProfileError> {
    validate_id(organization_id)?;
    let profile = profile.validated()?;
    let tx = conn.transaction()?;
    let saved = insert_profile(&tx, organization_id, profile)?;
    tx.commit()?;
    Ok(saved)
}

// Caller owns the transaction; reuse this inside the combined organization save.
fn insert_profile(
    tx: &Connection,
    organization_id: i64,
    profile: ProfileFields,
) -> Result<Contractor, ProfileError> {
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
         suffix = ?5
     WHERE id = ?6",
        params![
            profile.prefix,
            profile.first_name,
            profile.middle_name,
            profile.last_name,
            profile.suffix,
            id
        ],
    )?;
    tx.execute(
        "UPDATE contractors
     SET role = ?1,
         email = ?2,
         phone = ?3
     WHERE id = ?4",
        params![profile.role, profile.email, profile.phone, id,],
    )?;
    if let Some(details) = profile.details {
        crate::details::save_record(&tx, id, false, details)?;
    }
    let saved = get_contractor(&tx, id)?
        .ok_or(ProfileError::NotFound("Contractor not found or archived"))?;
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
             suffix = ?9
         WHERE id = ?10 AND archived_at IS NULL",
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
            id,
        ],
    )?;

    if changed == 0 {
        return Err(ProfileError::NotFound("Contractor not found or archived"));
    }

    if let Some(details) = profile.details {
        crate::details::save_record(&tx, id, false, details)?;
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
            "Status must be Active, Inactive, Retired or Deceased".into(),
        ));
    }
    let changed = conn.execute(
        "UPDATE contractors SET status = ?1 WHERE id = ?2 AND archived_at IS NULL",
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
    create_organization_with_contractor(conn, name, region, phone, email, notes, None)
}

pub fn create_organization_with_contractor(
    conn: &mut Connection,
    name: String,
    region: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    notes: Option<String>,
    contractor: Option<ProfileFields>,
) -> Result<Organization, ProfileError> {
    create_organization_complete(conn, name, region, phone, email, notes, contractor, None)
}

pub fn create_organization_complete(
    conn: &mut Connection,
    name: String,
    region: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    notes: Option<String>,
    contractor: Option<ProfileFields>,
    details: Option<crate::details::OrganizationDetails>,
) -> Result<Organization, ProfileError> {
    let contractor = contractor.map(ProfileFields::validated).transpose()?;
    let name = text(name, "Organization name", 200, true)?.unwrap();
    let region = text(region.unwrap_or_default(), "Region", 120, false)?;
    let email = text(email.unwrap_or_default(), "Email", 254, false)?;

    let phone = text(phone.unwrap_or_default(), "Phone", 80, false)?;

    let notes = notes_text(notes)?;
    if let Some(phone) = &phone {
        validate_phone(phone)?;
    }
    if let Some(email) = &email {
        validate_email(email)?;
    }
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO organizations (name, region, phone, email, notes) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![name, region, phone, email, notes],
    )?;
    let id = tx.last_insert_rowid();
    validate_id(id)?;
    if let Some(details) = details {
        crate::details::save_organization(&tx, id, details)?;
    }
    let saved = get_organizations(&tx)?
        .into_iter()
        .find(|org| org.id == id)
        .ok_or(ProfileError::NotFound("Organization not found"))?;
    if let Some(profile) = contractor {
        insert_profile(&tx, id, profile)?;
    }
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
    validate_id(id)?;
    let name = text(name, "Organization name", 200, true)?.unwrap();
    let region = text(region.unwrap_or_default(), "Region", 120, false)?;
    let phone = text(phone.unwrap_or_default(), "Phone", 80, false)?;
    let email = text(email.unwrap_or_default(), "Email", 254, false)?;
    let notes = notes_text(notes)?;
    if let Some(phone) = &phone {
        validate_phone(phone)?;
    }
    if let Some(email) = &email {
        validate_email(email)?;
    }
    if !update_organization_details(
        conn,
        id,
        &name,
        region.as_deref().unwrap_or(""),
        phone.as_deref(),
        email.as_deref(),
        notes.as_deref(),
    )? {
        return Err(ProfileError::NotFound("Organization not found or archived"));
    }
    get_organizations(conn)?
        .into_iter()
        .find(|org| org.id == id)
        .ok_or(ProfileError::NotFound("Organization not found or archived"))
}
pub fn set_organization_status(
    conn: &Connection,
    id: i64,
    status: &str,
) -> Result<Organization, ProfileError> {
    validate_id(id)?;

    if !matches!(status, "Active" | "Inactive") {
        return Err(ProfileError::InvalidInput(
            "Status must be Active or Inactive".into(),
        ));
    }

    let changed = conn.execute(
        "UPDATE organizations
         SET status = ?1,
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

pub fn set_organization_region(
    conn: &Connection,
    id: i64,
    region: Option<String>,
) -> Result<Organization, ProfileError> {
    validate_id(id)?;
    let region = text(region.unwrap_or_default(), "Region", 120, false)?;
    let changed = conn.execute(
        "UPDATE organizations SET region=?1,
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?2 AND archived_at IS NULL",
        params![region, id],
    )?;
    if changed == 0 {
        return Err(ProfileError::NotFound("Organization not found or archived"));
    }
    get_organizations(conn)?
        .into_iter()
        .find(|org| org.id == id)
        .ok_or(ProfileError::NotFound("Organization not found or archived"))
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

/// Combined update: core fields and optional details commit together.
pub fn update_organization_complete(
    conn: &mut Connection,
    id: i64,
    name: String,
    region: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    notes: Option<String>,
    details: Option<crate::details::OrganizationDetails>,
) -> Result<Organization, ProfileError> {
    let tx = conn.transaction()?;
    update_organization_profile(&tx, id, name, region, phone, email, notes)?;
    if let Some(details) = details {
        crate::details::save_organization(&tx, id, details)?;
    }
    let saved = get_organizations(&tx)?
        .into_iter()
        .find(|org| org.id == id)
        .ok_or(ProfileError::NotFound("Organization not found or archived"))?;
    tx.commit()?;
    Ok(saved)
}

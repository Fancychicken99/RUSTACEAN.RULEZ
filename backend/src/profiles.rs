//! Validated, atomic profile workflows. SQL and transaction ownership stay here.
use crate::database::{
    Contractor, Organization, add_contractor, archive_contractor, get_contractor,
    update_organization_details, get_organizations,
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
    pub full_name: String,
    pub role: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
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
        let full_name = text(self.full_name, "Full name", 200, true)?.unwrap();
        let role = text(self.role.unwrap_or_default(), "Role", 120, false)?;
        let email = text(self.email.unwrap_or_default(), "Email", 254, false)?;
        let phone = text(self.phone.unwrap_or_default(), "Phone", 80, false)?;
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
            role,
            email,
            phone,
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
        "UPDATE contractors SET role = ?1, email = ?2, phone = ?3 WHERE id = ?4",
        params![profile.role, profile.email, profile.phone, id],
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
        "UPDATE contractors SET full_name = ?1, role = ?2, email = ?3, phone = ?4
         WHERE id = ?5 AND archived_at IS NULL",
        params![
            profile.full_name,
            profile.role,
            profile.email,
            profile.phone,
            id
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
    if !matches!(status, "Active" | "Inactive") {
        return Err(ProfileError::InvalidInput(
            "Status must be Active or Inactive".into(),
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
    let name = text(name, "Organization name", 200, true)?.unwrap();
    let region = text(region.unwrap_or_default(), "Region", 120, false)?;
    let phone = text(phone.unwrap_or_default(), "Phone", 80, false)?;
    let email = text(email.unwrap_or_default(), "Email", 254, false)?;
    let notes = text(notes.unwrap_or_default(), "Notes", 5_000, false)?;
    if let Some(email) = &email {
        let parts: Vec<_> = email.split('@').collect();
        if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty()
            || !parts[1].contains('.') || parts[1].starts_with('.') || parts[1].ends_with('.')
            || email.chars().any(char::is_whitespace) {
            return Err(ProfileError::InvalidInput("Enter an email such as name@example.com".into()));
        }
    }
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO organizations (name, region, phone, email, notes) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![name, region, phone, email, notes],
    )?;
    let id = tx.last_insert_rowid();
    validate_id(id)?;
    let saved = get_organizations(&tx)?.into_iter().find(|org| org.id == id)
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
    validate_id(id)?;
    let name = text(name, "Organization name", 200, true)?.unwrap();
    let region = text(region.unwrap_or_default(), "Region", 120, false)?;
    let phone = text(phone.unwrap_or_default(), "Phone", 80, false)?;
    let email = text(email.unwrap_or_default(), "Email", 254, false)?;
    let notes = text(notes.unwrap_or_default(), "Notes", 5_000, false)?;
    if let Some(email) = &email {
        let parts: Vec<_> = email.split('@').collect();
        if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty()
            || !parts[1].contains('.') || parts[1].starts_with('.') || parts[1].ends_with('.')
            || email.chars().any(char::is_whitespace) {
            return Err(ProfileError::InvalidInput("Enter an email such as name@example.com".into()));
        }
    }
    if !update_organization_details(conn, id, &name, region.as_deref().unwrap_or(""), phone.as_deref(), email.as_deref(), notes.as_deref())? {
        return Err(ProfileError::NotFound("Organization not found or archived"));
    }
    get_organizations(conn)?.into_iter().find(|org| org.id == id)
        .ok_or(ProfileError::NotFound("Organization not found or archived"))
}

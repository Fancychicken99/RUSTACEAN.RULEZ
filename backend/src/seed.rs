//! Explicit additive synthetic import. Stable keys preserve edits and archives.
use crate::{
    profiles::{ProfileError, ProfileFields, validate_id},
    skills::{add_skill, assign_skill},
};
use rusqlite::{Connection, OptionalExtension, params};
use std::{
    collections::{HashMap, HashSet},
    fmt,
};

pub const SAMPLE_DATA: &str = include_str!("../../data/synthetic-contractors-v1.json");

#[derive(Debug)]
pub enum SeedError {
    InvalidDataset(String),
    Database(rusqlite::Error),
    Profile(ProfileError),
    Json(serde_json::Error),
}
impl fmt::Display for SeedError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidDataset(message) => f.write_str(message),
            Self::Profile(error) => error.fmt(f),
            _ => f.write_str("Unable to import sample data"),
        }
    }
}
impl std::error::Error for SeedError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Database(e) => Some(e),
            Self::Profile(e) => Some(e),
            Self::Json(e) => Some(e),
            _ => None,
        }
    }
}
impl From<rusqlite::Error> for SeedError {
    fn from(e: rusqlite::Error) -> Self {
        Self::Database(e)
    }
}
impl From<ProfileError> for SeedError {
    fn from(e: ProfileError) -> Self {
        Self::Profile(e)
    }
}
impl From<serde_json::Error> for SeedError {
    fn from(e: serde_json::Error) -> Self {
        Self::Json(e)
    }
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct Dataset {
    dataset_id: String,
    as_of: String,
    organizations: Vec<SeedOrganization>,
    contractors: Vec<SeedContractor>,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct SeedOrganization {
    key: String,
    name: String,
    region: String,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct SeedContractor {
    key: String,
    organization_key: String,
    profile: ProfileFields,
    status: String,
    skills: Vec<String>,
    last_contact_at: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct ImportReport {
    pub dataset_id: String,
    pub organizations_added: usize,
    pub contractors_added: usize,
    pub organizations_skipped: usize,
    pub contractors_skipped: usize,
}

fn invalid(message: &str) -> SeedError {
    SeedError::InvalidDataset(message.into())
}
fn valid_key(key: &str) -> bool {
    !key.is_empty()
        && key.len() <= 64
        && key
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

pub fn import_sample_data(conn: &mut Connection) -> Result<ImportReport, SeedError> {
    import_dataset(conn, SAMPLE_DATA)
}

// Public for isolated backend tests; IPC only exposes the embedded sample file.
pub fn import_dataset(conn: &mut Connection, json: &str) -> Result<ImportReport, SeedError> {
    let dataset: Dataset = serde_json::from_str(json)?;
    if !valid_key(&dataset.dataset_id)
        || dataset.organizations.is_empty()
        || dataset.contractors.is_empty()
    {
        return Err(invalid("Sample dataset identity or records are invalid"));
    }
    let tx = conn.transaction()?;
    let valid_date: bool =
        tx.query_row("SELECT COALESCE(date(?1) = ?1, 0)", [&dataset.as_of], |r| {
            r.get(0)
        })?;
    if !valid_date {
        return Err(invalid("Sample dataset date is invalid"));
    }
    tx.execute_batch(
        "CREATE TABLE IF NOT EXISTS synthetic_organizations (
           dataset_id TEXT NOT NULL, record_key TEXT NOT NULL,
           organization_id INTEGER NOT NULL REFERENCES organizations(id),
           PRIMARY KEY(dataset_id, record_key));
         CREATE TABLE IF NOT EXISTS synthetic_contractors (
           dataset_id TEXT NOT NULL, record_key TEXT NOT NULL,
           contractor_id INTEGER NOT NULL REFERENCES contractors(id),
           PRIMARY KEY(dataset_id, record_key));",
    )?;
    let mut report = ImportReport {
        dataset_id: dataset.dataset_id.clone(),
        organizations_added: 0,
        contractors_added: 0,
        organizations_skipped: 0,
        contractors_skipped: 0,
    };
    let mut organizations = HashMap::new();
    for org in dataset.organizations {
        if !valid_key(&org.key)
            || !org.name.starts_with("Fictional ")
            || org.name.chars().count() > 200
            || org.name.chars().any(char::is_control)
            || org.region.trim().is_empty()
            || org.region.chars().count() > 120
            || org.region.chars().any(char::is_control)
            || organizations.contains_key(&org.key)
        {
            return Err(invalid("Sample organization is invalid or duplicated"));
        }
        let existing: Option<i64> = tx.query_row(
            "SELECT organization_id FROM synthetic_organizations WHERE dataset_id = ?1 AND record_key = ?2",
            params![dataset.dataset_id, org.key], |r| r.get(0),
        ).optional()?;
        let id = if let Some(id) = existing {
            let exists: bool = tx.query_row(
                "SELECT EXISTS(SELECT 1 FROM organizations WHERE id = ?1)",
                [id],
                |r| r.get(0),
            )?;
            if !exists {
                return Err(invalid(
                    "An imported organization is missing; import stopped",
                ));
            }
            report.organizations_skipped += 1;
            id
        } else {
            tx.execute(
                "INSERT INTO organizations(name, region) VALUES (?1, ?2)",
                params![org.name.trim(), org.region.trim()],
            )?;
            let id = tx.last_insert_rowid();
            validate_id(id)?;
            tx.execute(
                "INSERT INTO synthetic_organizations VALUES (?1, ?2, ?3)",
                params![dataset.dataset_id, org.key, id],
            )?;
            report.organizations_added += 1;
            id
        };
        organizations.insert(org.key, id);
    }
    let mut keys = HashSet::new();
    for record in dataset.contractors {
        if !valid_key(&record.key)
            || !keys.insert(record.key.clone())
            || !record.profile.full_name.starts_with("Fictional ")
            || !matches!(
                record.status.as_str(),
                "Active" | "Inactive" | "Retired" | "Deceased"
            )
        {
            return Err(invalid("Sample contractor identity or status is invalid"));
        }
        let profile = record.profile.validated()?;
        if !profile
            .email
            .as_deref()
            .is_some_and(|email| email.ends_with("@example.com"))
        {
            return Err(invalid("Sample emails must use example.com"));
        }
        if record.skills.is_empty()
            || record.skills.iter().any(|s| {
                s.trim().is_empty() || s.chars().count() > 120 || s.chars().any(char::is_control)
            })
        {
            return Err(invalid("Sample skills are invalid"));
        }
        if let Some(date) = &record.last_contact_at {
            let valid: bool = tx.query_row(
                "SELECT COALESCE(datetime(?1) = ?1 AND date(?1) <= ?2, 0)",
                params![date, dataset.as_of],
                |r| r.get(0),
            )?;
            if !valid || date.len() != 19 {
                return Err(invalid("Sample contact timestamp is invalid"));
            }
        }
        let organization_id = *organizations
            .get(&record.organization_key)
            .ok_or_else(|| invalid("Sample organization reference is missing"))?;
        let existing: Option<i64> = tx.query_row(
            "SELECT contractor_id FROM synthetic_contractors WHERE dataset_id = ?1 AND record_key = ?2",
            params![dataset.dataset_id, record.key], |r| r.get(0),
        ).optional()?;
        if let Some(id) = existing {
            let exists: bool = tx.query_row(
                "SELECT EXISTS(SELECT 1 FROM contractors WHERE id = ?1)",
                [id],
                |r| r.get(0),
            )?;
            if !exists {
                return Err(invalid("An imported contractor is missing; import stopped"));
            }
            report.contractors_skipped += 1;
            continue;
        }
        let active: bool = tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM organizations WHERE id = ?1 AND archived_at IS NULL)",
            [organization_id],
            |r| r.get(0),
        )?;
        if !active {
            return Err(invalid("Sample organization was archived; import stopped"));
        }
        tx.execute("INSERT INTO contractors(full_name, organization_id, status, role, email, phone) VALUES (?1,?2,?3,?4,?5,?6)", params![profile.full_name, organization_id, record.status, profile.role, profile.email, profile.phone])?;
        let id = tx.last_insert_rowid();
        validate_id(id)?;
        for skill in record.skills {
            let skill_id = add_skill(&tx, &skill)?;
            assign_skill(&tx, id, skill_id)?;
        }
        if let Some(date) = record.last_contact_at {
            tx.execute("INSERT INTO contact_events(contractor_id, method, note, contacted_at) VALUES (?1, 'Other', 'Fictional sample contact', ?2)", params![id, date])?;
        }
        tx.execute(
            "INSERT INTO synthetic_contractors VALUES (?1, ?2, ?3)",
            params![dataset.dataset_id, record.key, id],
        )?;
        report.contractors_added += 1;
    }
    tx.commit()?;
    Ok(report)
}

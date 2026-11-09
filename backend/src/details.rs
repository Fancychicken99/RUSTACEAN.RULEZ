//! Optional profile details. Validation and SQL stay in the backend.
use crate::profiles::{ProfileError, validate_id};
use rusqlite::{Connection, params};
use std::collections::BTreeMap;

#[derive(Debug, Default, serde::Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct AddressFields {
    pub street_address_1: Option<String>,
    pub street_address_2: Option<String>,
    pub city: Option<String>,
    pub state_province: Option<String>,
    pub country: Option<String>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum CustomField {
    Text {
        value: String,
    },
    LongText {
        value: String,
    },
    Relation {
        entity_type: EntityType,
        entity_id: i64,
    },
}

#[derive(Debug, Clone, Copy, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    Contractor,
    Organization,
}

#[derive(Debug, Default, serde::Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct RecordDetails {
    pub image: Option<crate::media::ImageUpload>,
    pub address: AddressFields,
    pub extra_information: BTreeMap<String, CustomField>,
}

#[derive(Debug, Default, serde::Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct OrganizationDetails {
    pub image: Option<crate::media::ImageUpload>,
    pub address: AddressFields,
    pub extra_information: BTreeMap<String, CustomField>,
    pub secondary_phone: Option<String>,
    pub secondary_contact: Option<String>,
    pub secondary_email: Option<String>,
}

fn invalid(message: &str) -> ProfileError {
    ProfileError::InvalidInput(message.into())
}

fn optional(
    value: Option<String>,
    label: &str,
    max: usize,
) -> Result<Option<String>, ProfileError> {
    let value = value.unwrap_or_default();
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max || value.chars().any(char::is_control) {
        return Err(invalid(&format!(
            "{label} must be at most {max} characters with no control characters"
        )));
    }
    Ok(Some(value.into()))
}

fn custom_json(
    conn: &Connection,
    fields: BTreeMap<String, CustomField>,
) -> Result<String, ProfileError> {
    if fields.len() > 30 {
        return Err(invalid("Use at most 30 custom fields"));
    }
    let mut clean = BTreeMap::new();
    for (name, field) in fields {
        let name = optional(Some(name), "Custom field name", 80)?
            .ok_or_else(|| invalid("Custom field name is required"))?;
        if matches!(name.as_str(), "__proto__" | "prototype" | "constructor") {
            return Err(invalid("Choose a different custom field name"));
        }
        let field = match field {
            CustomField::Text { value } => CustomField::Text {
                value: optional(Some(value), "Custom field value", 500)?
                    .ok_or_else(|| invalid("Custom field value is required"))?,
            },
            CustomField::LongText { value } => {
                let value = value.trim();
                if value.is_empty()
                    || value.chars().count() > 5_000
                    || value
                        .chars()
                        .any(|c| c.is_control() && c != '\n' && c != '\r' && c != '\t')
                {
                    return Err(invalid(
                        "Long text must contain 1 to 5000 characters without unsupported control characters",
                    ));
                }
                CustomField::LongText {
                    value: value.replace("\r\n", "\n").replace('\r', "\n"),
                }
            }
            CustomField::Relation {
                entity_type,
                entity_id,
            } => {
                validate_id(entity_id)?;
                let table = match entity_type {
                    EntityType::Contractor => "contractors",
                    EntityType::Organization => "organizations",
                };
                // Table is selected from a closed enum, never from request text.
                let exists: bool = conn.query_row(
                    &format!("SELECT EXISTS(SELECT 1 FROM {table} WHERE id = ?1)"),
                    [entity_id],
                    |row| row.get(0),
                )?;
                if !exists {
                    return Err(invalid("Related record no longer exists"));
                }
                // Existing links to archived records remain editable/preservable.
                CustomField::Relation {
                    entity_type,
                    entity_id,
                }
            }
        };
        if clean.insert(name, field).is_some() {
            return Err(invalid("Custom field names must be unique"));
        }
    }
    let json =
        serde_json::to_string(&clean).map_err(|_| invalid("Unable to encode custom fields"))?;
    if json.len() > 65_536 {
        return Err(invalid("Custom fields must total at most 64 KiB"));
    }
    Ok(json)
}

pub(crate) fn save_record(
    conn: &Connection,
    id: i64,
    organization: bool,
    details: RecordDetails,
) -> Result<(), ProfileError> {
    let address = details.address;
    let street1 = optional(address.street_address_1, "Street address", 200)?;
    let street2 = optional(address.street_address_2, "Street address 2", 200)?;
    let city = optional(address.city, "City", 100)?;
    let state = optional(address.state_province, "State or province", 100)?;
    let country = optional(address.country, "Country", 100)?;
    let extra = custom_json(conn, details.extra_information)?;
    let table = if organization {
        "organizations"
    } else {
        "contractors"
    };
    let changed = conn.execute(
        &format!(
            "UPDATE {table} SET street_address_1=?1, street_address_2=?2,
        city=?3, state_province=?4, country=?5, extra_information=?6,
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?7 AND archived_at IS NULL"
        ),
        params![street1, street2, city, state, country, extra, id],
    )?;
    if changed == 0 {
        return Err(invalid("Record not found or archived"));
    }
    if let Some(image) = details.image {
        crate::media::save(
            conn,
            if organization {
                crate::workspace::Kind::Organization
            } else {
                crate::workspace::Kind::Contractor
            },
            id,
            image,
        )?;
    }
    Ok(())
}

pub(crate) fn save_organization(
    conn: &Connection,
    id: i64,
    details: OrganizationDetails,
) -> Result<(), ProfileError> {
    let phone = optional(details.secondary_phone, "Secondary phone", 80)?;
    let contact = optional(details.secondary_contact, "Secondary contact", 200)?;
    let email = optional(details.secondary_email, "Secondary email", 254)?;
    if let Some(value) = &phone {
        crate::profiles::validate_phone(value)?;
    }
    if let Some(value) = &email {
        crate::profiles::validate_email(value)?;
    }
    save_record(
        conn,
        id,
        true,
        RecordDetails {
            image: details.image,
            address: details.address,
            extra_information: details.extra_information,
        },
    )?;
    conn.execute("UPDATE organizations SET secondary_phone=?1, secondary_contact=?2, secondary_email=?3 WHERE id=?4",
        params![phone, contact, email, id])?;
    Ok(())
}

pub(crate) fn read_custom(
    row: &rusqlite::Row<'_>,
    index: usize,
) -> rusqlite::Result<serde_json::Value> {
    let json: String = row.get(index)?;
    serde_json::from_str(&json).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(
            index,
            rusqlite::types::Type::Text,
            Box::new(error),
        )
    })
}

pub fn migrate_details(conn: &Connection) -> rusqlite::Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if version >= 5 {
        return Ok(());
    }
    if version != 4 {
        return Err(rusqlite::Error::InvalidQuery);
    }
    let tx = conn.unchecked_transaction()?;
    tx.execute_batch("
        ALTER TABLE contractors ADD COLUMN extra_information TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extra_information) AND json_type(extra_information)='object');
        ALTER TABLE organizations ADD COLUMN extra_information TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extra_information) AND json_type(extra_information)='object');
        PRAGMA user_version=5;")?;
    tx.commit()
}

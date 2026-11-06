use rusqlite::{Connection, OptionalExtension, Result, params};

/// Persistent field-level audit dates. Values are not copied into the log; it records
/// which fields changed and when, while the current values remain on the profile.
pub fn create_change_history(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS record_change_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL CHECK(entity_type IN ('contractor','organization')),
            entity_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            changed_fields TEXT NOT NULL,
            occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
         );
         CREATE INDEX IF NOT EXISTS idx_record_change_history_entity
             ON record_change_history(entity_type, entity_id, occurred_at, id);
         DROP TRIGGER IF EXISTS audit_contractor_insert;
         DROP TRIGGER IF EXISTS audit_contractor_update;
         DROP TRIGGER IF EXISTS audit_organization_insert;
         DROP TRIGGER IF EXISTS audit_organization_update;
         DROP TRIGGER IF EXISTS audit_contact_insert;
         CREATE TRIGGER IF NOT EXISTS audit_contractor_insert AFTER INSERT ON contractors BEGIN
           UPDATE contractors SET created_at=COALESCE(NEW.created_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
             updated_at=COALESCE(NEW.updated_at,NEW.created_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id=NEW.id;
           INSERT INTO record_change_history(entity_type,entity_id,action,changed_fields)
           VALUES('contractor',NEW.id,'Created','Initial profile fields');
         END;
         CREATE TRIGGER IF NOT EXISTS audit_contractor_update AFTER UPDATE ON contractors
         WHEN OLD.full_name IS NOT NEW.full_name OR OLD.role IS NOT NEW.role OR OLD.email IS NOT NEW.email
           OR OLD.phone IS NOT NEW.phone OR OLD.status IS NOT NEW.status OR OLD.organization_id IS NOT NEW.organization_id
           OR OLD.prefix IS NOT NEW.prefix OR OLD.first_name IS NOT NEW.first_name OR OLD.middle_name IS NOT NEW.middle_name
           OR OLD.last_name IS NOT NEW.last_name OR OLD.suffix IS NOT NEW.suffix
           OR OLD.street_address_1 IS NOT NEW.street_address_1 OR OLD.street_address_2 IS NOT NEW.street_address_2
           OR OLD.city IS NOT NEW.city OR OLD.state_province IS NOT NEW.state_province OR OLD.country IS NOT NEW.country
           OR OLD.extra_information IS NOT NEW.extra_information OR OLD.archived_at IS NOT NEW.archived_at BEGIN
           INSERT INTO record_change_history(entity_type,entity_id,action,changed_fields)
           VALUES('contractor',NEW.id,
             CASE WHEN OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN 'Archived'
                  WHEN OLD.status IS NOT NEW.status THEN 'Status changed' ELSE 'Updated' END,
             trim(
               (CASE WHEN OLD.full_name IS NOT NEW.full_name THEN 'Name, ' ELSE '' END)||
               (CASE WHEN OLD.role IS NOT NEW.role THEN 'Role, ' ELSE '' END)||
               (CASE WHEN OLD.email IS NOT NEW.email THEN 'Email, ' ELSE '' END)||
               (CASE WHEN OLD.phone IS NOT NEW.phone THEN 'Phone, ' ELSE '' END)||
               (CASE WHEN OLD.status IS NOT NEW.status THEN 'Status, ' ELSE '' END)||
               (CASE WHEN OLD.organization_id IS NOT NEW.organization_id THEN 'Organization, ' ELSE '' END)||
               (CASE WHEN OLD.prefix IS NOT NEW.prefix OR OLD.first_name IS NOT NEW.first_name OR OLD.middle_name IS NOT NEW.middle_name OR OLD.last_name IS NOT NEW.last_name OR OLD.suffix IS NOT NEW.suffix THEN 'Name details, ' ELSE '' END)||
               (CASE WHEN OLD.street_address_1 IS NOT NEW.street_address_1 OR OLD.street_address_2 IS NOT NEW.street_address_2 OR OLD.city IS NOT NEW.city OR OLD.state_province IS NOT NEW.state_province OR OLD.country IS NOT NEW.country THEN 'Address, ' ELSE '' END)||
               (CASE WHEN OLD.extra_information IS NOT NEW.extra_information THEN 'Additional information, ' ELSE '' END)||
               (CASE WHEN OLD.archived_at IS NOT NEW.archived_at THEN 'Archive status, ' ELSE '' END), ', '));
         END;
         CREATE TRIGGER IF NOT EXISTS audit_organization_insert AFTER INSERT ON organizations BEGIN
           UPDATE organizations SET created_at=COALESCE(NEW.created_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')),
             updated_at=COALESCE(NEW.updated_at,NEW.created_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id=NEW.id;
           INSERT INTO record_change_history(entity_type,entity_id,action,changed_fields)
           VALUES('organization',NEW.id,'Created','Initial organization fields');
         END;
         CREATE TRIGGER IF NOT EXISTS audit_organization_update AFTER UPDATE ON organizations
         WHEN OLD.name IS NOT NEW.name OR OLD.region IS NOT NEW.region OR OLD.phone IS NOT NEW.phone OR OLD.email IS NOT NEW.email
           OR OLD.notes IS NOT NEW.notes OR OLD.status IS NOT NEW.status OR OLD.secondary_phone IS NOT NEW.secondary_phone
           OR OLD.secondary_contact IS NOT NEW.secondary_contact OR OLD.secondary_email IS NOT NEW.secondary_email
           OR OLD.street_address_1 IS NOT NEW.street_address_1 OR OLD.street_address_2 IS NOT NEW.street_address_2
           OR OLD.city IS NOT NEW.city OR OLD.state_province IS NOT NEW.state_province OR OLD.country IS NOT NEW.country
           OR OLD.archived_at IS NOT NEW.archived_at OR OLD.out_of_business_at IS NOT NEW.out_of_business_at
           OR OLD.extra_information IS NOT NEW.extra_information BEGIN
           INSERT INTO record_change_history(entity_type,entity_id,action,changed_fields)
           VALUES('organization',NEW.id,
             CASE WHEN OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN 'Archived'
                  WHEN OLD.out_of_business_at IS NOT NEW.out_of_business_at THEN 'Status changed' ELSE 'Updated' END,
             trim(
               (CASE WHEN OLD.name IS NOT NEW.name THEN 'Name, ' ELSE '' END)||
               (CASE WHEN OLD.region IS NOT NEW.region THEN 'Region, ' ELSE '' END)||
               (CASE WHEN OLD.phone IS NOT NEW.phone OR OLD.secondary_phone IS NOT NEW.secondary_phone THEN 'Phone, ' ELSE '' END)||
               (CASE WHEN OLD.email IS NOT NEW.email OR OLD.secondary_email IS NOT NEW.secondary_email THEN 'Email, ' ELSE '' END)||
               (CASE WHEN OLD.secondary_contact IS NOT NEW.secondary_contact THEN 'Secondary contact, ' ELSE '' END)||
               (CASE WHEN OLD.street_address_1 IS NOT NEW.street_address_1 OR OLD.street_address_2 IS NOT NEW.street_address_2 OR OLD.city IS NOT NEW.city OR OLD.state_province IS NOT NEW.state_province OR OLD.country IS NOT NEW.country THEN 'Address, ' ELSE '' END)||
               (CASE WHEN OLD.notes IS NOT NEW.notes THEN 'Notes, ' ELSE '' END)||
               (CASE WHEN OLD.extra_information IS NOT NEW.extra_information THEN 'Additional information, ' ELSE '' END)||
               (CASE WHEN OLD.status IS NOT NEW.status OR OLD.out_of_business_at IS NOT NEW.out_of_business_at THEN 'Status, ' ELSE '' END)||
               (CASE WHEN OLD.archived_at IS NOT NEW.archived_at THEN 'Archive status, ' ELSE '' END), ', '));
         END;
         CREATE TRIGGER IF NOT EXISTS audit_contact_insert AFTER INSERT ON contact_events BEGIN
           INSERT INTO record_change_history(entity_type,entity_id,action,changed_fields)
           VALUES('contractor',NEW.contractor_id,'Contact recorded',NEW.method || CASE WHEN NEW.note IS NULL THEN '' ELSE ' note' END);
         END;"
    )?;
    Ok(())
}

#[derive(Debug, serde::Serialize)]
pub struct RecordChange {
    pub id: i64,
    pub entity_type: String,
    pub entity_id: i64,
    pub action: String,
    pub changed_fields: String,
    pub occurred_at: String,
}

pub fn get_record_history(
    conn: &Connection,
    entity_type: &str,
    entity_id: i64,
) -> Result<Vec<RecordChange>> {
    let mut stmt = conn.prepare(
        "SELECT id, entity_type, entity_id, action, changed_fields, occurred_at
         FROM record_change_history WHERE entity_type = ?1 AND entity_id = ?2
         ORDER BY occurred_at DESC, id DESC",
    )?;
    let rows = stmt.query_map(params![entity_type, entity_id], |row| {
        Ok(RecordChange {
            id: row.get(0)?,
            entity_type: row.get(1)?,
            entity_id: row.get(2)?,
            action: row.get(3)?,
            changed_fields: row.get(4)?,
            occurred_at: row.get(5)?,
        })
    })?;
    rows.collect()
}

// Create the history table
pub fn create_history_table(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS contractor_organization_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractor_id INTEGER NOT NULL,
            previous_organization_id INTEGER,
            new_organization_id INTEGER,
            changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            note TEXT,

            FOREIGN KEY (contractor_id)
                REFERENCES contractors(id),
            FOREIGN KEY (previous_organization_id)
                REFERENCES organizations(id),
            FOREIGN KEY (new_organization_id)
                REFERENCES organizations(id)
        );
        ",
    )?;

    Ok(())
}

// Transfer contractor and save the change
pub fn transfer_contractor(
    conn: &mut Connection,
    contractor_id: i64,
    new_organization_id: i64,
) -> Result<bool> {
    let tx = conn.transaction()?;

    // Find the contractor's current organization
    let previous: Option<(Option<i64>, Option<String>)> = tx
        .query_row(
            "SELECT c.organization_id, o.name
             FROM contractors c
             LEFT JOIN organizations o
               ON c.organization_id = o.id
             WHERE c.id = ?1
               AND c.archived_at IS NULL",
            [contractor_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?;

    let Some((previous_id, previous_name)) = previous else {
        return Ok(false);
    };

    // Avoid recording a transfer to the same organization
    if previous_id == Some(new_organization_id) {
        return Ok(false);
    }

    // Verify that the new organization exists and is active
    let new_name: String = tx.query_row(
        "SELECT name FROM organizations
         WHERE id = ?1
           AND archived_at IS NULL",
        [new_organization_id],
        |row| row.get(0),
    )?;

    // Update the contractor's organization
    tx.execute(
        "UPDATE contractors
         SET organization_id = ?1
         WHERE id = ?2",
        params![new_organization_id, contractor_id],
    )?;

    // Generate an automatic note
    let note = format!(
        "Organization changed from {} to {}",
        previous_name.as_deref().unwrap_or("Unassigned"),
        new_name
    );

    // Save the transfer to history
    tx.execute(
        "INSERT INTO contractor_organization_history
         (contractor_id, previous_organization_id,
          new_organization_id, note)
         VALUES (?1, ?2, ?3, ?4)",
        params![contractor_id, previous_id, new_organization_id, note],
    )?;

    tx.commit()?;

    Ok(true)
}

// Structure for retrieving history
#[derive(Debug, serde::Serialize)]
pub struct OrganizationHistory {
    pub id: i64,
    pub contractor_id: i64,
    pub previous_organization: Option<String>,
    pub new_organization: Option<String>,
    pub changed_at: String,
    pub note: Option<String>,
}

// Retrieve all organization changes for a contractor
pub fn get_organization_history(
    conn: &Connection,
    contractor_id: i64,
) -> Result<Vec<OrganizationHistory>> {
    let mut stmt = conn.prepare(
        "SELECT
            h.id,
            h.contractor_id,
            old.name,
            new.name,
            h.changed_at,
            h.note
         FROM contractor_organization_history h
         LEFT JOIN organizations old
           ON h.previous_organization_id = old.id
         LEFT JOIN organizations new
           ON h.new_organization_id = new.id
         WHERE h.contractor_id = ?1
         ORDER BY h.changed_at DESC, h.id DESC",
    )?;

    let history = stmt.query_map([contractor_id], |row| {
        Ok(OrganizationHistory {
            id: row.get(0)?,
            contractor_id: row.get(1)?,
            previous_organization: row.get(2)?,
            new_organization: row.get(3)?,
            changed_at: row.get(4)?,
            note: row.get(5)?,
        })
    })?;

    history.collect()
}

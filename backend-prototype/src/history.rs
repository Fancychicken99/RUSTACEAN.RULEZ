use rusqlite::{Connection, OptionalExtension, Result, params};

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

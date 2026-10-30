use rusqlite::{Connection, Result, params};

// Create the communication history table
pub fn create_contact_table(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS contact_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractor_id INTEGER NOT NULL,
            method TEXT NOT NULL
                CHECK(method IN (
                    'Email', 'Phone', 'SMS', 'Teams', 'Other'
                )),
            note TEXT,
            contacted_at TEXT NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (contractor_id)
                REFERENCES contractors(id)
        );

        CREATE INDEX IF NOT EXISTS idx_contact_events
        ON contact_events(contractor_id, contacted_at);
        ",
    )?;

    Ok(())
}

// Record a communication with a contractor
pub fn record_contact(
    conn: &Connection,
    contractor_id: i64,
    method: &str,
    note: &str,
) -> Result<bool> {
    let rows_added = conn.execute(
        "INSERT INTO contact_events
         (contractor_id, method, note)
         SELECT id, ?2, ?3
         FROM contractors
         WHERE id = ?1
           AND archived_at IS NULL",
        params![contractor_id, method, note],
    )?;

    Ok(rows_added == 1)
}

// Retrieve the most recent contact date
pub fn get_last_contact(conn: &Connection, contractor_id: i64) -> Result<Option<String>> {
    conn.query_row(
        "SELECT MAX(contacted_at)
         FROM contact_events
         WHERE contractor_id = ?1",
        [contractor_id],
        |row| row.get(0),
    )
}

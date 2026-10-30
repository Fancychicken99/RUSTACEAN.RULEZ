use crate::database::Contractor;
use rusqlite::{Connection, Result, params};
// Create tables for contractor skills
pub fn create_skill_tables(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL COLLATE NOCASE UNIQUE
        );

        CREATE TABLE IF NOT EXISTS contractor_skills (
            contractor_id INTEGER NOT NULL,
            skill_id INTEGER NOT NULL,

            PRIMARY KEY (contractor_id, skill_id),

            FOREIGN KEY (contractor_id)
                REFERENCES contractors(id),

            FOREIGN KEY (skill_id)
                REFERENCES skills(id)
        );
        ",
    )?;

    Ok(())
}

// Add a skill or retrieve its existing ID
pub fn add_skill(conn: &Connection, name: &str) -> Result<i64> {
    conn.execute(
        "INSERT OR IGNORE INTO skills (name)
         VALUES (?1)",
        params![name.trim()],
    )?;

    let skill_id = conn.query_row(
        "SELECT id FROM skills
         WHERE name = ?1 COLLATE NOCASE",
        params![name.trim()],
        |row| row.get(0),
    )?;

    Ok(skill_id)
}

// Assign a skill to a contractor

pub fn assign_skill(conn: &Connection, contractor_id: i64, skill_id: i64) -> Result<bool> {
    let rows_added = conn.execute(
        "INSERT OR IGNORE INTO contractor_skills
         (contractor_id, skill_id)
         VALUES (?1, ?2)",
        params![contractor_id, skill_id],
    )?;

    Ok(rows_added > 0)
}

pub fn get_contractors_by_skill(conn: &Connection, skill_name: &str) -> Result<Vec<Contractor>> {
    let mut stmt = conn.prepare(
        "SELECT
            c.id,
            c.full_name,
            o.name,
            o.region,
            c.status,
            c.role,
            c.email,
            c.phone,
            c.photo_path,
            c.organization_id
         FROM contractors c
         JOIN contractor_skills cs
           ON c.id = cs.contractor_id
         JOIN skills s
           ON cs.skill_id = s.id
         LEFT JOIN organizations o
           ON c.organization_id = o.id
         WHERE c.archived_at IS NULL
           AND s.name = ?1 COLLATE NOCASE
         ORDER BY c.full_name",
    )?;

    let contractors = stmt.query_map(params![skill_name.trim()], |row| {
        Ok(Contractor {
            id: row.get(0)?,
            full_name: row.get(1)?,
            organization_name: row.get(2)?,
            region: row.get(3)?,
            status: row.get(4)?,
            role: row.get(5)?,
            email: row.get(6)?,
            phone: row.get(7)?,
            photo_path: row.get(8)?,
            organization_id: row.get(9)?,
        })
    })?;

    contractors.collect()
}

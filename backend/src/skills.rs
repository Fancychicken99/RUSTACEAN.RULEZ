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

pub fn assign_organization_skill(
    conn: &Connection,
    organization_id: i64,
    skill_id: i64,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO organization_skills
         (organization_id, skill_id)
         SELECT o.id, s.id
         FROM organizations o
         CROSS JOIN skills s
         WHERE o.id = ?1
           AND o.archived_at IS NULL
           AND s.id = ?2",
        params![organization_id, skill_id],
    )?;

    Ok(())
}
pub fn remove_contractor_skill(
    conn: &Connection,
    contractor_id: i64,
    skill_id: i64,
) -> rusqlite::Result<bool> {
    let changed = conn.execute(
        "DELETE FROM contractor_skills
         WHERE contractor_id = ?1 AND skill_id = ?2",
        params![contractor_id, skill_id],
    )?;

    Ok(changed > 0)
}

pub fn remove_organization_skill(
    conn: &Connection,
    organization_id: i64,
    skill_id: i64,
) -> rusqlite::Result<bool> {
    let changed = conn.execute(
        "DELETE FROM organization_skills
         WHERE organization_id = ?1 AND skill_id = ?2",
        params![organization_id, skill_id],
    )?;

    Ok(changed > 0)
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
            c.organization_id,
            c.prefix,
            c.first_name,
            c.middle_name,
            c.last_name,
            c.suffix    
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
            prefix: row.get(10)?,
            first_name: row.get(11)?,
            middle_name: row.get(12)?,
            last_name: row.get(13)?,
            suffix: row.get(14)?,
        })
    })?;

    contractors.collect()
}
pub fn assign_skill(
    conn: &Connection,
    contractor_id: i64,
    skill_id: i64,
) -> rusqlite::Result<bool> {
    let changed = conn.execute(
        "INSERT OR IGNORE INTO contractor_skills
         (contractor_id, skill_id)
         SELECT c.id, s.id
         FROM contractors c
         CROSS JOIN skills s
         WHERE c.id = ?1
           AND c.archived_at IS NULL
           AND s.id = ?2",
        params![contractor_id, skill_id],
    )?;

    Ok(changed > 0)
}

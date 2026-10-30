use crate::database::Contractor;
use rusqlite::{Connection, Result};

pub fn get_contractors_by_region(conn: &Connection, region: &str) -> Result<Vec<Contractor>> {
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
            c.photo_path
         FROM contractors c
         JOIN organizations o
           ON c.organization_id = o.id
         WHERE c.archived_at IS NULL
           AND o.region = ?1 COLLATE NOCASE
         ORDER BY c.full_name",
    )?;

    let contractors = stmt.query_map([region], |row| {
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
        })
    })?;

    contractors.collect()
}

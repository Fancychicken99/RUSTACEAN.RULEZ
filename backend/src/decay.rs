use crate::database::Contractor;
use rusqlite::{Connection, Result, params};

pub fn get_contractors_needing_followup(
    conn: &Connection,
    minimum_days: u32,
) -> Result<Vec<Contractor>> {
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

         LEFT JOIN organizations o
            ON c.organization_id = o.id

         LEFT JOIN (
             SELECT contractor_id,
                    MAX(contacted_at) AS last_contact
             FROM contact_events
             GROUP BY contractor_id
         ) lc ON lc.contractor_id = c.id

         WHERE c.archived_at IS NULL
           AND (
               lc.last_contact IS NULL
               OR (
                   julianday('now') -
                   julianday(lc.last_contact)
               ) >= ?1
           )

         ORDER BY c.full_name",
    )?;

    let contractors = stmt.query_map(params![i64::from(minimum_days)], |row| {
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

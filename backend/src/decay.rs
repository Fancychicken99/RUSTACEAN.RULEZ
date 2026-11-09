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
            c.organization_id,
            c.prefix,
            c.first_name,
            c.middle_name,
            c.last_name,
            c.suffix, c.street_address_1, c.street_address_2, c.city, c.state_province, c.country, c.extra_information, (SELECT MAX(e.contacted_at) FROM contact_events e WHERE e.contractor_id=c.id), CAST(MAX(0,julianday('now')-julianday((SELECT MAX(e.contacted_at) FROM contact_events e WHERE e.contractor_id=c.id))) AS INTEGER), c.created_at, c.updated_at
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

         ORDER BY CASE WHEN c.status IN ('Retired','Deceased') THEN 1 ELSE 0 END, c.full_name",
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
            prefix: row.get(10)?,
            first_name: row.get(11)?,
            middle_name: row.get(12)?,
            last_name: row.get(13)?,
            suffix: row.get(14)?,
            street_address_1: row.get(15)?,
            street_address_2: row.get(16)?,
            city: row.get(17)?,
            state_province: row.get(18)?,
            country: row.get(19)?,
            extra_information: crate::details::read_custom(row, 20)?,
            last_contact_at: row.get(21)?,
            days_since_last_contact: row.get(22)?,
            created_at: row.get(23)?,
            updated_at: row.get(24)?,
        })
    })?;

    contractors.collect()
}

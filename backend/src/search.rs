use crate::database::Contractor;
use rusqlite::{Connection, Result, params};

pub fn search_contractors(
    conn: &Connection,
    region: Option<&str>,
    skill: Option<&str>,
) -> Result<Vec<Contractor>> {
    let region = region.map(str::trim).filter(|s| !s.is_empty());
    let skill = skill.map(str::trim).filter(|s| !s.is_empty());

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
            c.suffix, c.street_address_1, c.street_address_2, c.city, c.state_province, c.country, c.extra_information, (SELECT MAX(e.contacted_at) FROM contact_events e WHERE e.contractor_id=c.id), CAST(MAX(0,julianday('now')-julianday((SELECT MAX(e.contacted_at) FROM contact_events e WHERE e.contractor_id=c.id))) AS INTEGER)
         FROM contractors c
         LEFT JOIN organizations o
            ON c.organization_id = o.id
         WHERE c.archived_at IS NULL

           AND (
               ?1 IS NULL
               OR o.region = ?1 COLLATE NOCASE
           )

           AND (
               ?2 IS NULL
               OR EXISTS (
                   SELECT 1
                   FROM contractor_skills cs
                   JOIN skills s ON cs.skill_id = s.id
                   WHERE cs.contractor_id = c.id
                     AND s.name = ?2 COLLATE NOCASE
               )
           )

         ORDER BY CASE WHEN c.status IN ('Retired','Deceased') THEN 1 ELSE 0 END, c.full_name",
    )?;

    let contractors = stmt.query_map(params![region, skill], |row| {
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
        })
    })?;

    contractors.collect()
}

pub fn search_contractors_by_name(conn: &Connection, name: &str) -> Result<Vec<Contractor>> {
    let name = name.trim();

    if name.is_empty() || name.chars().count() > 200 {
        return Ok(Vec::new());
    }

    let mut stmt = conn.prepare(
        "SELECT id
         FROM contractors
         WHERE archived_at IS NULL
           AND (
               full_name LIKE '%' || ?1 || '%'
               OR soundex(full_name) = soundex(?1)
               OR soundex(first_name) = soundex(?1)
               OR soundex(last_name) = soundex(?1)
           )
         ORDER BY full_name",
    )?;

    let ids = stmt
        .query_map([name], |row| row.get::<_, i64>(0))?
        .collect::<Result<Vec<_>>>()?;

    ids.into_iter()
        .map(|id| {
            crate::database::get_contractor(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
        })
        .collect()
}

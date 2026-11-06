use rusqlite::{Connection, Result, params};

pub fn add_tag(conn: &Connection, name: &str) -> Result<i64> {
    let name = name.trim();

    if name.is_empty() || name.chars().count() > 100 {
        return Err(rusqlite::Error::InvalidParameterName(
            "Tag name must contain 1 to 100 characters".into(),
        ));
    }

    if name.chars().any(char::is_control) {
        return Err(rusqlite::Error::InvalidParameterName(
            "Tag name contains invalid characters".into(),
        ));
    }

    conn.execute(
        "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
        params![name],
    )?;

    conn.query_row(
        "SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE",
        params![name],
        |row| row.get(0),
    )
}

pub fn assign_contractor_tag(conn: &Connection, contractor_id: i64, tag_id: i64) -> Result<bool> {
    let changed = conn.execute(
        "INSERT OR IGNORE INTO contractor_tags
         (contractor_id, tag_id)
         SELECT c.id, t.id
         FROM contractors c
         CROSS JOIN tags t
         WHERE c.id = ?1
           AND c.archived_at IS NULL
           AND t.id = ?2",
        params![contractor_id, tag_id],
    )?;

    Ok(changed > 0)
}

pub fn assign_organization_tag(
    conn: &Connection,
    organization_id: i64,
    tag_id: i64,
) -> Result<bool> {
    let changed = conn.execute(
        "INSERT OR IGNORE INTO organization_tags
         (organization_id, tag_id)
         SELECT o.id, t.id
         FROM organizations o
         CROSS JOIN tags t
         WHERE o.id = ?1
           AND o.archived_at IS NULL
           AND t.id = ?2",
        params![organization_id, tag_id],
    )?;

    Ok(changed > 0)
}

pub fn remove_contractor_tag(conn: &Connection, contractor_id: i64, tag_id: i64) -> Result<bool> {
    let changed = conn.execute(
        "DELETE FROM contractor_tags
         WHERE contractor_id = ?1 AND tag_id = ?2",
        params![contractor_id, tag_id],
    )?;

    Ok(changed > 0)
}

pub fn remove_organization_tag(
    conn: &Connection,
    organization_id: i64,
    tag_id: i64,
) -> Result<bool> {
    let changed = conn.execute(
        "DELETE FROM organization_tags
         WHERE organization_id = ?1 AND tag_id = ?2",
        params![organization_id, tag_id],
    )?;

    Ok(changed > 0)
}

#[derive(Debug, serde::Serialize)]
pub struct Tag {
    pub id: i64,
    pub name: String,
}

pub fn get_contractor_tags(conn: &Connection, contractor_id: i64) -> Result<Vec<Tag>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name
         FROM tags t
         JOIN contractor_tags ct ON ct.tag_id = t.id
         JOIN contractors c ON c.id = ct.contractor_id
         WHERE ct.contractor_id = ?1
           AND c.archived_at IS NULL
         ORDER BY t.name",
    )?;

    let tags = stmt.query_map(params![contractor_id], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    })?;

    tags.collect()
}

pub fn get_organization_tags(conn: &Connection, organization_id: i64) -> Result<Vec<Tag>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name
         FROM tags t
         JOIN organization_tags ot ON ot.tag_id = t.id
         JOIN organizations o ON o.id = ot.organization_id
         WHERE ot.organization_id = ?1
           AND o.archived_at IS NULL
         ORDER BY t.name",
    )?;

    let tags = stmt.query_map(params![organization_id], |row| {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    })?;

    tags.collect()
}

use crate::database::{Contractor, get_contractor};

pub fn get_contractors_by_tag(conn: &Connection, tag_id: i64) -> Result<Vec<Contractor>> {
    let mut stmt = conn.prepare(
        "SELECT ct.contractor_id
         FROM contractor_tags ct
         JOIN contractors c ON c.id = ct.contractor_id
         WHERE ct.tag_id = ?1
           AND c.archived_at IS NULL
         ORDER BY c.full_name",
    )?;

    let ids = stmt
        .query_map(params![tag_id], |row| row.get::<_, i64>(0))?
        .collect::<Result<Vec<_>>>()?;

    ids.into_iter()
        .map(|id| get_contractor(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows))
        .collect()
}

use crate::database::{Organization, get_organizations};

pub fn get_organizations_by_tag(conn: &Connection, tag_id: i64) -> Result<Vec<Organization>> {
    let organizations = get_organizations(conn)?;

    let mut stmt = conn.prepare(
        "SELECT organization_id
         FROM organization_tags
         WHERE tag_id = ?1",
    )?;

    let ids = stmt
        .query_map(params![tag_id], |row| row.get::<_, i64>(0))?
        .collect::<Result<Vec<_>>>()?;

    Ok(organizations
        .into_iter()
        .filter(|org| ids.contains(&org.id))
        .collect())
}

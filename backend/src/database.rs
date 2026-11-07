use rusqlite::{Connection, OptionalExtension, Result, params};

pub fn create_tables(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            region TEXT
        );

        CREATE TABLE IF NOT EXISTS contractors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            organization_id INTEGER,
            status TEXT NOT NULL DEFAULT 'Active',
            archived_at TEXT,
            FOREIGN KEY (organization_id)
                REFERENCES organizations(id)
        );
        ",
    )?;

    Ok(())
}

pub fn add_organization(conn: &Connection, name: &str, region: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO organizations (name, region)
         VALUES (?1, ?2)",
        params![name, region],
    )?;

    Ok(conn.last_insert_rowid())
}

pub fn add_contractor(conn: &Connection, full_name: &str, organization_id: i64) -> Result<i64> {
    conn.execute(
        "INSERT INTO contractors
         (full_name, organization_id)
         VALUES (?1, ?2)",
        params![full_name, organization_id],
    )?;

    Ok(conn.last_insert_rowid())
}

#[derive(Debug, serde::Serialize)]
pub struct Contractor {
    pub id: i64,
    pub full_name: String,

    // Sprint 2: Individual name fields
    pub prefix: Option<String>,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub suffix: Option<String>,

    pub organization_id: Option<i64>,
    pub organization_name: Option<String>,
    pub region: Option<String>,
    pub status: String,
    pub role: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub photo_path: Option<String>,
    pub last_contact_at: Option<String>,
    pub days_since_last_contact: Option<i64>,
    pub street_address_1: Option<String>,
    pub street_address_2: Option<String>,
    pub city: Option<String>,
    pub state_province: Option<String>,
    pub country: Option<String>,
    pub extra_information: serde_json::Value,
}

pub fn get_contractors(conn: &Connection) -> Result<Vec<Contractor>> {
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
 ORDER BY CASE WHEN c.status IN ('Retired','Deceased') THEN 1 ELSE 0 END, c.full_name",
    )?;

    let contractors = stmt.query_map([], |row| {
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

pub fn update_contractor_name(
    conn: &Connection,
    contractor_id: i64,
    new_name: &str,
) -> Result<bool> {
    let rows_updated = conn.execute(
        "UPDATE contractors
         SET full_name = ?1
         WHERE id = ?2
         AND archived_at IS NULL",
        params![new_name, contractor_id],
    )?;

    Ok(rows_updated > 0)
}

// Fetch the exact saved record after a workflow; no full-directory scan.
pub fn get_contractor(conn: &Connection, id: i64) -> Result<Option<Contractor>> {
    conn.query_row(
        "SELECT c.id, c.full_name, o.name, o.region, c.status,
        c.role, c.email, c.phone, c.photo_path, c.organization_id,
        c.prefix, c.first_name, c.middle_name, c.last_name, c.suffix, c.street_address_1, c.street_address_2, c.city, c.state_province, c.country, c.extra_information, (SELECT MAX(e.contacted_at) FROM contact_events e WHERE e.contractor_id=c.id), CAST(MAX(0,julianday('now')-julianday((SELECT MAX(e.contacted_at) FROM contact_events e WHERE e.contractor_id=c.id))) AS INTEGER)
 FROM contractors c
 LEFT JOIN organizations o ON c.organization_id = o.id
 WHERE c.id = ?1 AND c.archived_at IS NULL",
        [id],
        |row| {
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
        },
    )
    .optional()
}

pub fn archive_contractor(conn: &Connection, contractor_id: i64) -> Result<bool> {
    let rows_updated = conn.execute(
        "UPDATE contractors
         SET archived_at = CURRENT_TIMESTAMP
         WHERE id = ?1
         AND archived_at IS NULL",
        params![contractor_id],
    )?;

    Ok(rows_updated > 0)
}

pub fn add_profile_fields(conn: &Connection) -> Result<()> {
    // Check the database version
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    // Only add the new columns once
    if version == 0 {
        conn.execute_batch(
            "
            BEGIN IMMEDIATE;

            ALTER TABLE contractors ADD COLUMN role TEXT;
            ALTER TABLE contractors ADD COLUMN email TEXT;
            ALTER TABLE contractors ADD COLUMN phone TEXT;
            ALTER TABLE contractors ADD COLUMN photo_path TEXT;

            PRAGMA user_version = 1;

            COMMIT;
            ",
        )?;
    }

    Ok(())
}

pub fn update_contractor_details(
    conn: &Connection,
    contractor_id: i64,
    role: &str,
    email: &str,
    phone: &str,
) -> Result<bool> {
    let rows_updated = conn.execute(
        "UPDATE contractors
         SET role = ?1,
             email = ?2,
             phone = ?3
         WHERE id = ?4
         AND archived_at IS NULL",
        params![role, email, phone, contractor_id],
    )?;

    Ok(rows_updated > 0)
}

#[derive(Debug, serde::Serialize)]
pub struct Organization {
    pub id: i64,
    pub name: String,
    pub region: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub notes: Option<String>,
    pub status: String,

    // Sprint 2 organization information
    pub secondary_phone: Option<String>,
    pub secondary_contact: Option<String>,
    pub extra_information: serde_json::Value,
    pub secondary_email: Option<String>,
    pub street_address_1: Option<String>,
    pub street_address_2: Option<String>,
    pub city: Option<String>,
    pub state_province: Option<String>,
    pub country: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

pub fn get_organizations(conn: &Connection) -> Result<Vec<Organization>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, region, phone, email, notes, status,
       secondary_email, street_address_1, street_address_2,
       city, state_province, country, created_at, updated_at, secondary_phone, secondary_contact, extra_information
         FROM organizations
         WHERE archived_at IS NULL
         ORDER BY name",
    )?;

    let organizations = stmt.query_map([], |row| {
        Ok(Organization {
            id: row.get(0)?,
            name: row.get(1)?,
            region: row.get(2)?,
            phone: row.get(3)?,
            email: row.get(4)?,
            notes: row.get(5)?,
            status: row.get(6)?,
            secondary_email: row.get(7)?,
            street_address_1: row.get(8)?,
            street_address_2: row.get(9)?,
            city: row.get(10)?,
            state_province: row.get(11)?,
            country: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
            secondary_phone: row.get(15)?,
            secondary_contact: row.get(16)?,
            extra_information: crate::details::read_custom(row, 17)?,
        })
    })?;

    organizations.collect()
}

pub fn update_organization(
    conn: &Connection,
    organization_id: i64,
    new_name: &str,
    new_region: &str,
) -> Result<bool> {
    let rows_updated = conn.execute(
        "UPDATE organizations
         SET name = ?1,
             region = ?2
         WHERE id = ?3",
        params![new_name, new_region, organization_id],
    )?;

    Ok(rows_updated > 0)
}

pub fn update_organization_details(
    conn: &Connection,
    organization_id: i64,
    name: &str,
    region: &str,
    phone: Option<&str>,
    email: Option<&str>,
    notes: Option<&str>,
) -> Result<bool> {
    let rows_updated = conn.execute(
        "UPDATE organizations SET name = ?1, region = ?2, phone = ?3, email = ?4, notes = ?5
         WHERE id = ?6 AND archived_at IS NULL",
        params![name, region, phone, email, notes, organization_id],
    )?;
    Ok(rows_updated > 0)
}

pub fn add_organization_profile_fields(conn: &Connection) -> Result<()> {
    add_organization_archive_field(conn)
}

pub fn add_organization_archive_field(conn: &Connection) -> Result<()> {
    // Make sure the first migration is completed
    add_profile_fields(conn)?;

    // Check the database version
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    // Add organization archive field only once
    if version < 2 {
        conn.execute_batch(
            "
            BEGIN IMMEDIATE;

            ALTER TABLE organizations
            ADD COLUMN archived_at TEXT;

            PRAGMA user_version = 2;

            COMMIT;
            ",
        )?;
    }

    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if version < 3 {
        conn.execute_batch(
            "BEGIN IMMEDIATE;
             ALTER TABLE organizations ADD COLUMN phone TEXT;
             ALTER TABLE organizations ADD COLUMN email TEXT;
             ALTER TABLE organizations ADD COLUMN notes TEXT;
             PRAGMA user_version = 3;
             COMMIT;",
        )?;
    }

    Ok(())
}

/// Sprint 2 migration. Adds nullable fields so existing records remain readable.
/// Keep the legacy full_name and existing status fields during UI transition.
pub fn migrate_sprint2(conn: &Connection) -> Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if version >= 4 {
        return Ok(());
    }
    // Prior migrations are responsible for bringing the schema to version 3.
    if version < 3 {
        return Err(rusqlite::Error::InvalidQuery);
    }
    conn.execute_batch(
        "BEGIN IMMEDIATE;
         ALTER TABLE contractors ADD COLUMN prefix TEXT;
         ALTER TABLE contractors ADD COLUMN first_name TEXT;
         ALTER TABLE contractors ADD COLUMN middle_name TEXT;
         ALTER TABLE contractors ADD COLUMN last_name TEXT;
         ALTER TABLE contractors ADD COLUMN suffix TEXT;
         ALTER TABLE contractors ADD COLUMN street_address_1 TEXT;
         ALTER TABLE contractors ADD COLUMN street_address_2 TEXT;
         ALTER TABLE contractors ADD COLUMN city TEXT;
         ALTER TABLE contractors ADD COLUMN state_province TEXT;
         ALTER TABLE contractors ADD COLUMN country TEXT;
         ALTER TABLE contractors ADD COLUMN created_at TEXT;
         ALTER TABLE contractors ADD COLUMN updated_at TEXT;
         ALTER TABLE organizations ADD COLUMN secondary_phone TEXT;
         ALTER TABLE organizations ADD COLUMN secondary_contact TEXT;
         ALTER TABLE organizations ADD COLUMN secondary_email TEXT;
         ALTER TABLE organizations ADD COLUMN street_address_1 TEXT;
         ALTER TABLE organizations ADD COLUMN street_address_2 TEXT;
         ALTER TABLE organizations ADD COLUMN city TEXT;
         ALTER TABLE organizations ADD COLUMN state_province TEXT;
         ALTER TABLE organizations ADD COLUMN country TEXT;
         ALTER TABLE organizations ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'
             CHECK (status IN ('Active', 'Inactive'));
         ALTER TABLE organizations ADD COLUMN created_at TEXT;
         ALTER TABLE organizations ADD COLUMN updated_at TEXT;
         CREATE TABLE IF NOT EXISTS tags (
             id INTEGER PRIMARY KEY,
             name TEXT NOT NULL COLLATE NOCASE UNIQUE
                 CHECK(length(trim(name)) > 0)
         );
         CREATE TABLE IF NOT EXISTS contractor_tags (
             contractor_id INTEGER NOT NULL REFERENCES contractors(id),
             tag_id INTEGER NOT NULL REFERENCES tags(id),
             PRIMARY KEY(contractor_id, tag_id)
         );
         CREATE TABLE IF NOT EXISTS organization_tags (
             organization_id INTEGER NOT NULL REFERENCES organizations(id),
             tag_id INTEGER NOT NULL REFERENCES tags(id),
             PRIMARY KEY(organization_id, tag_id)
         );
         CREATE TABLE IF NOT EXISTS organization_skills (
             organization_id INTEGER NOT NULL REFERENCES organizations(id),
             skill_id INTEGER NOT NULL REFERENCES skills(id),
             PRIMARY KEY(organization_id, skill_id)
         );
         CREATE INDEX IF NOT EXISTS idx_contractor_tags_tag ON contractor_tags(tag_id);
         CREATE INDEX IF NOT EXISTS idx_organization_tags_tag ON organization_tags(tag_id);
         CREATE INDEX IF NOT EXISTS idx_organization_skills_skill ON organization_skills(skill_id);
         UPDATE contractors SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
             WHERE created_at IS NULL;
         UPDATE organizations SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
             WHERE created_at IS NULL;
         PRAGMA user_version = 4;
         COMMIT;",
    )?;
    Ok(())
}

// Separate function for archiving organizations
pub fn archive_organization(conn: &Connection, organization_id: i64) -> Result<bool> {
    let rows_updated = conn.execute(
        "UPDATE organizations
         SET archived_at = CURRENT_TIMESTAMP
         WHERE id = ?1
         AND archived_at IS NULL",
        params![organization_id],
    )?;

    Ok(rows_updated > 0)
}

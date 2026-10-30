use rusqlite::{Connection, Result, params};

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
    pub organization_name: Option<String>,
    pub region: Option<String>,
    pub status: String,
    pub role: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub photo_path: Option<String>,
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
            c.photo_path
         FROM contractors c
         LEFT JOIN organizations o
         ON c.organization_id = o.id
         WHERE c.archived_at IS NULL
         ORDER BY c.full_name",
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
}

pub fn get_organizations(conn: &Connection) -> Result<Vec<Organization>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, region
         FROM organizations
         WHERE archived_at IS NULL
         ORDER BY name",
    )?;

    let organizations = stmt.query_map([], |row| {
        Ok(Organization {
            id: row.get(0)?,
            name: row.get(1)?,
            region: row.get(2)?,
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

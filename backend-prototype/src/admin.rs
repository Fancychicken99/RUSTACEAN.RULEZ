use rusqlite::{Connection, OptionalExtension, Result as SqlResult};

use crate::auth::{hash_password, verify_password};

// Create the table that stores the administrator's password hash
pub fn create_admin_table(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS local_admin (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );",
    )?;

    Ok(())
}

// Create the administrator only if one does not exist
pub fn create_first_admin(
    conn: &Connection,
    password: &str,
) -> Result<bool, Box<dyn std::error::Error>> {
    if password.chars().count() < 12 {
        return Err("Password must contain at least 12 characters".into());
    }

    let exists: i64 = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM local_admin WHERE id = 1)",
        [],
        |row| row.get(0),
    )?;

    if exists != 0 {
        return Ok(false);
    }

    let password_hash = hash_password(password)?;

    let inserted = conn.execute(
        "INSERT OR IGNORE INTO local_admin (id, password_hash)
         VALUES (1, ?1)",
        [password_hash],
    )?;

    Ok(inserted == 1)
}

// Verify the password entered at login
pub fn verify_admin_login(conn: &Connection, password: &str) -> SqlResult<bool> {
    let stored_hash: Option<String> = conn
        .query_row(
            "SELECT password_hash
             FROM local_admin
             WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .optional()?;

    match stored_hash {
        Some(hash) => Ok(verify_password(password, &hash)),
        None => Ok(false),
    }
}

pub fn admin_exists(conn: &Connection) -> SqlResult<bool> {
    let exists: bool = conn.query_row(
        "SELECT EXISTS(
            SELECT 1 FROM local_admin WHERE id = 1
        )",
        [],
        |row| row.get(0),
    )?;

    Ok(exists)
}

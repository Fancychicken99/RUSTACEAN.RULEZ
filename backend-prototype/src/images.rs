use rusqlite::{Connection, params};
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

pub fn save_contractor_photo(
    conn: &Connection,
    contractor_id: i64,
    source_path: &Path,
    photos_directory: &Path,
) -> Result<PathBuf, Box<dyn Error>> {
    // Make sure the contractor exists and is not archived
    let exists: bool = conn.query_row(
        "SELECT EXISTS(
            SELECT 1 FROM contractors
            WHERE id = ?1 AND archived_at IS NULL
        )",
        [contractor_id],
        |row| row.get(0),
    )?;

    if !exists {
        return Err("Contractor not found or archived".into());
    }

    // Check the image's file extension
    let extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    if !["jpg", "jpeg", "png", "webp"].contains(&extension.as_str()) {
        return Err("Unsupported image file type".into());
    }

    // Limit files to 5 MB
    let metadata = fs::metadata(source_path)?;

    if !metadata.is_file() || metadata.len() == 0 || metadata.len() > 5 * 1024 * 1024 {
        return Err("Invalid image file size or type".into());
    }

    // Create the local photos folder if needed
    fs::create_dir_all(photos_directory)?;

    // Give the copied photo a predictable filename
    let filename = format!("contractor_{}.{}", contractor_id, extension);

    let destination = photos_directory.join(filename);

    // Copy the image into local storage
    fs::copy(source_path, &destination)?;

    // Save its location in the database
    conn.execute(
        "UPDATE contractors
         SET photo_path = ?1
         WHERE id = ?2
           AND archived_at IS NULL",
        params![destination.to_string_lossy().as_ref(), contractor_id],
    )?;

    Ok(destination)
}

pub fn create_organization_logo_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS organization_logos (
            organization_id INTEGER PRIMARY KEY,
            logo_path TEXT NOT NULL,
            FOREIGN KEY (organization_id)
                REFERENCES organizations(id)
        );",
    )?;

    Ok(())
}

pub fn save_organization_logo(
    conn: &Connection,
    organization_id: i64,
    source_path: &Path,
    logos_directory: &Path,
) -> Result<PathBuf, Box<dyn Error>> {
    // Confirm the organization exists and is active
    let exists: bool = conn.query_row(
        "SELECT EXISTS(
            SELECT 1 FROM organizations
            WHERE id = ?1 AND archived_at IS NULL
        )",
        [organization_id],
        |row| row.get(0),
    )?;

    if !exists {
        return Err("Organization not found or archived".into());
    }

    // Check the extension
    let extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if !["jpg", "jpeg", "png", "webp"].contains(&extension.as_str()) {
        return Err("Unsupported logo file type".into());
    }

    // Limit logo files to 5 MB
    let metadata = fs::metadata(source_path)?;

    if !metadata.is_file() || metadata.len() == 0 || metadata.len() > 5 * 1024 * 1024 {
        return Err("Invalid logo file size".into());
    }

    // Create the local logo folder
    fs::create_dir_all(logos_directory)?;

    // Copy the logo
    let filename = format!("organization_{}.{}", organization_id, extension);

    let destination = logos_directory.join(filename);

    fs::copy(source_path, &destination)?;

    // Save or update the logo location in SQLite
    conn.execute(
        "INSERT INTO organization_logos
            (organization_id, logo_path)
         VALUES (?1, ?2)
         ON CONFLICT(organization_id)
         DO UPDATE SET logo_path = excluded.logo_path",
        params![organization_id, destination.to_string_lossy().as_ref()],
    )?;

    Ok(destination)
}

use rusqlite::Connection;
use std::fs;

use secure_crm_backend::database::{add_organization, archive_organization};

use secure_crm_backend::images::save_organization_logo;
use secure_crm_backend::setup::initialize_database;

#[test]
fn test_save_organization_logo() -> Result<(), Box<dyn std::error::Error>> {
    // Create a temporary database
    let conn = Connection::open_in_memory()?;
    initialize_database(&conn)?;

    // Create a fictional organization
    let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi")?;

    // Create temporary folders
    let temp = tempfile::tempdir()?;
    let source = temp.path().join("sample_logo.png");
    let logos_folder = temp.path().join("logos");

    // Sample bytes for testing file copying
    fs::write(&source, b"sample test image bytes")?;

    // Save the organization's logo
    let saved_path = save_organization_logo(&conn, org_id, &source, &logos_folder)?;

    // Check that the new file exists
    assert!(saved_path.exists());

    // Check that the contents were copied
    assert_eq!(fs::read(&saved_path)?, fs::read(&source)?);

    // Check the path saved in SQLite
    let database_path: String = conn.query_row(
        "SELECT logo_path
         FROM organization_logos
         WHERE organization_id = ?1",
        [org_id],
        |row| row.get(0),
    )?;

    assert_eq!(database_path, saved_path.to_string_lossy());

    // An invalid organization should be rejected
    let invalid_result = save_organization_logo(&conn, 9999, &source, &logos_folder);

    assert!(invalid_result.is_err());

    // Archived organizations should be rejected
    archive_organization(&conn, org_id)?;

    let archived_result = save_organization_logo(&conn, org_id, &source, &logos_folder);

    assert!(archived_result.is_err());

    Ok(())
}

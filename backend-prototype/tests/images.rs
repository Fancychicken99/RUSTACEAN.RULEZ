use rusqlite::Connection;
use std::fs;

use secure_crm_backend::database::{
    add_contractor, add_organization, add_profile_fields, create_tables,
};

use secure_crm_backend::images::save_contractor_photo;

#[test]
fn test_save_contractor_photo() -> Result<(), Box<dyn std::error::Error>> {
    // Create a temporary database
    let conn = Connection::open_in_memory()?;
    create_tables(&conn)?;
    add_profile_fields(&conn)?;

    // Add a fictional organization and contractor
    let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi")?;

    let contractor_id = add_contractor(&conn, "Jordan Lee", org_id)?;

    // Create a temporary folder
    let temp = tempfile::tempdir()?;

    // Create a tiny, valid PNG image for testing
    let sample_png: &[u8] = &[
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2,
        0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 120, 156, 99, 16, 50, 9, 3, 0, 0,
        248, 0, 157, 204, 106, 33, 120, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ];

    let source = temp.path().join("sample.png");
    fs::write(&source, sample_png)?;

    // Choose where the CRM should store photos
    let photos_folder = temp.path().join("photos");

    // Save the photo
    let saved_path = save_contractor_photo(&conn, contractor_id, &source, &photos_folder)?;

    // Check that the copied file exists
    assert!(saved_path.exists());

    // Check that the contents match the original
    assert_eq!(fs::read(&saved_path)?, fs::read(&source)?);

    // Check that SQLite saved the correct path
    let database_path: String = conn.query_row(
        "SELECT photo_path
         FROM contractors
         WHERE id = ?1",
        [contractor_id],
        |row| row.get(0),
    )?;

    assert_eq!(database_path, saved_path.to_string_lossy());

    // A nonexistent contractor cannot receive a photo
    let invalid_result = save_contractor_photo(&conn, 9999, &source, &photos_folder);

    assert!(invalid_result.is_err());

    Ok(())
}

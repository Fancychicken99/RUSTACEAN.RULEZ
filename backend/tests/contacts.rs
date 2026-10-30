use rusqlite::Connection;

use secure_crm_backend::database::{
    add_contractor, add_organization, archive_contractor, create_tables,
};

use secure_crm_backend::contacts::{create_contact_table, get_last_contact, record_contact};

#[test]
fn test_record_contact() -> rusqlite::Result<()> {
    let conn = Connection::open_in_memory()?;

    // Create tables
    create_tables(&conn)?;
    create_contact_table(&conn)?;

    // Add fictional organization
    let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi")?;

    // Add fictional contractor
    let contractor_id = add_contractor(&conn, "Jordan Lee", org_id)?;

    // No contact has been recorded yet
    assert_eq!(get_last_contact(&conn, contractor_id)?, None);

    // Record a fictional email interaction
    let saved = record_contact(
        &conn,
        contractor_id,
        "Email",
        "Followed up regarding a project",
    )?;

    assert!(saved);

    // Check that a timestamp was saved
    let last_contact = get_last_contact(&conn, contractor_id)?;

    assert!(last_contact.is_some());

    // Verify one communication was recorded
    let count: i64 = conn.query_row(
        "SELECT COUNT(*)
         FROM contact_events
         WHERE contractor_id = ?1",
        [contractor_id],
        |row| row.get(0),
    )?;

    assert_eq!(count, 1);

    // Archived contractors cannot receive new contact logs
    archive_contractor(&conn, contractor_id)?;

    let saved_again = record_contact(&conn, contractor_id, "Phone", "Additional communication")?;

    assert!(!saved_again);

    Ok(())
}

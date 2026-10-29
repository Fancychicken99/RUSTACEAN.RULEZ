use rusqlite::Connection;

use secure_crm_backend::database::{
    add_contractor, add_organization, add_organization_archive_field, create_tables,
};

use secure_crm_backend::history::{
    create_history_table, get_organization_history, transfer_contractor,
};
#[test]
fn test_transfer_contractor() -> rusqlite::Result<()> {
    let mut conn = Connection::open_in_memory()?;

    // Prepare tables and migrations
    create_tables(&conn)?;
    add_organization_archive_field(&conn)?;
    create_history_table(&conn)?;

    // Create two fictional companies
    let old_org = add_organization(&conn, "Example Defense LLC", "East Nairobi")?;

    let new_org = add_organization(&conn, "Global Engineering Group", "North America")?;

    // Add fictional contractor
    let contractor_id = add_contractor(&conn, "Jordan Lee", old_org)?;

    // Transfer the contractor
    let transferred = transfer_contractor(&mut conn, contractor_id, new_org)?;

    assert!(transferred);

    // Verify the current organization changed
    let current_org: i64 = conn.query_row(
        "SELECT organization_id FROM contractors
         WHERE id = ?1",
        [contractor_id],
        |row| row.get(0),
    )?;

    assert_eq!(current_org, new_org);

    // Verify the history was saved
    let (previous, new, note): (i64, i64, String) = conn.query_row(
        "SELECT previous_organization_id,
                    new_organization_id, note
             FROM contractor_organization_history
             WHERE contractor_id = ?1",
        [contractor_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    assert_eq!(previous, old_org);
    assert_eq!(new, new_org);

    assert!(note.contains("Example Defense LLC"));
    assert!(note.contains("Global Engineering Group"));

    // Retrieve the contractor's organization history
    let history = get_organization_history(&conn, contractor_id)?;

    // Verify one transfer was recorded
    assert_eq!(history.len(), 1);

    // Verify the previous organization
    assert_eq!(
        history[0].previous_organization.as_deref(),
        Some("Example Defense LLC")
    );

    // Verify the new organization
    assert_eq!(
        history[0].new_organization.as_deref(),
        Some("Global Engineering Group")
    );

    // Verify a timestamp exists
    assert!(!history[0].changed_at.is_empty());

    Ok(())
}

use rusqlite::Connection;

use secure_crm_backend::database::{
    add_contractor, add_organization, add_profile_fields, archive_contractor, create_tables,
};

use secure_crm_backend::contacts::create_contact_table;

use secure_crm_backend::decay::get_contractors_needing_followup;

#[test]
fn test_contact_decay() -> rusqlite::Result<()> {
    // Create temporary database
    let conn = Connection::open_in_memory()?;

    // Prepare the tables
    create_tables(&conn)?;
    add_profile_fields(&conn)?;
    create_contact_table(&conn)?;

    // Create fictional organization
    let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi")?;

    // Create three fictional contractors
    let jordan = add_contractor(&conn, "Jordan Lee", org_id)?;

    let alex = add_contractor(&conn, "Alex Morgan", org_id)?;

    let morgan = add_contractor(&conn, "Morgan Reed", org_id)?;

    // Jordan was contacted 45 days ago
    conn.execute(
        "INSERT INTO contact_events
         (contractor_id, method, contacted_at)
         VALUES (?1, 'Email', datetime('now', '-45 days'))",
        [jordan],
    )?;

    // Alex was contacted 5 days ago
    conn.execute(
        "INSERT INTO contact_events
         (contractor_id, method, contacted_at)
         VALUES (?1, 'Phone', datetime('now', '-5 days'))",
        [alex],
    )?;

    // Morgan has never been contacted

    // Find contractors needing follow-up after 30 days
    let results = get_contractors_needing_followup(&conn, 30)?;

    // Jordan and Morgan should appear
    assert_eq!(results.len(), 2);
    assert!(results.iter().any(|c| c.id == jordan));
    assert!(results.iter().any(|c| c.id == morgan));

    // Alex should NOT appear
    assert!(!results.iter().any(|c| c.id == alex));

    // Archived contractors should not appear
    archive_contractor(&conn, morgan)?;

    let updated_results = get_contractors_needing_followup(&conn, 30)?;

    assert_eq!(updated_results.len(), 1);
    assert_eq!(updated_results[0].id, jordan);

    Ok(())
}

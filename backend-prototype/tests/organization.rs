use rusqlite::Connection;

use secure_crm_backend::database::{
    add_organization, add_organization_archive_field, archive_organization, create_tables,
    get_organizations, update_organization,
};

#[test]
fn test_get_organizations() {
    // Create a temporary database
    let conn = Connection::open_in_memory().unwrap();

    // Create the database tables
    create_tables(&conn).unwrap();
    add_organization_archive_field(&conn).unwrap();

    // Add two fictional organizations
    add_organization(&conn, "Example Defense LLC", "East Nairobi").unwrap();

    add_organization(&conn, "Global Engineering Group", "North America").unwrap();

    // Retrieve organizations
    let organizations = get_organizations(&conn).unwrap();

    // Verify both organizations were saved
    assert_eq!(organizations.len(), 2);

    // Verify their names and locations
    assert_eq!(organizations[0].name, "Example Defense LLC");
    assert_eq!(organizations[0].region.as_deref(), Some("East Nairobi"));

    assert_eq!(organizations[1].name, "Global Engineering Group");
    assert_eq!(organizations[1].region.as_deref(), Some("North America"));
}

#[test]
fn test_update_organization() {
    // Create temporary database
    let conn = Connection::open_in_memory().unwrap();

    create_tables(&conn).unwrap();
    add_organization_archive_field(&conn).unwrap();

    // Add fictional organization
    let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi").unwrap();

    // Update the organization
    let updated =
        update_organization(&conn, org_id, "Example Defense Group", "North America").unwrap();

    assert!(updated);

    // Retrieve the updated organization
    let organizations = get_organizations(&conn).unwrap();

    // Verify no duplicate was created
    assert_eq!(organizations.len(), 1);

    // Verify information was updated
    assert_eq!(organizations[0].id, org_id);
    assert_eq!(organizations[0].name, "Example Defense Group");
    assert_eq!(organizations[0].region.as_deref(), Some("North America"));
}
#[test]
fn test_archive_organization() {
    // Create temporary database
    let conn = Connection::open_in_memory().unwrap();

    create_tables(&conn).unwrap();
    add_organization_archive_field(&conn).unwrap();

    // Add a fictional organization
    let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi").unwrap();

    // Archive the organization
    let archived = archive_organization(&conn, org_id).unwrap();

    assert!(archived);

    // Verify it no longer appears in the active list
    let organizations = get_organizations(&conn).unwrap();

    assert_eq!(organizations.len(), 0);

    // Verify the record still exists in SQLite
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM organizations WHERE id = ?1",
            [org_id],
            |row| row.get(0),
        )
        .unwrap();

    assert_eq!(count, 1);

    // Verify the archive date was saved
    let archived_at: Option<String> = conn
        .query_row(
            "SELECT archived_at FROM organizations WHERE id = ?1",
            [org_id],
            |row| row.get(0),
        )
        .unwrap();

    assert!(archived_at.is_some());

    // Prevent archiving the same organization twice
    let archived_again = archive_organization(&conn, org_id).unwrap();

    assert!(!archived_again);
}

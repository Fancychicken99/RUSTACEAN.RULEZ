use rusqlite::Connection;
use secure_crm_backend::setup::initialize_database;

#[test]
fn test_initialize_database() -> rusqlite::Result<()> {
    // Create a temporary SQLite database
    let conn = Connection::open_in_memory()?;

    // Initialize all database tables
    initialize_database(&conn)?;

    // Verify that all seven tables exist
    let count: i64 = conn.query_row(
        r#"
        SELECT COUNT(*)
        FROM sqlite_master
        WHERE type = 'table'
        AND name IN (
            'contractors',
            'organizations',
            'contractor_organization_history',
            'skills',
            'contractor_skills',
            'contact_events',
            'organization_logos',
            'local_admin'
        )
        "#,
        [],
        |row| row.get(0),
    )?;

    assert_eq!(count, 8);

    // Running initialization twice should be safe
    initialize_database(&conn)?;

    // Confirm the database migration version
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    assert_eq!(version, 2);

    Ok(())
}

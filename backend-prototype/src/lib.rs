pub mod admin;
pub mod auth;
pub mod contacts;
pub mod database;
pub mod decay;
pub mod filtering;
pub mod history;
pub mod images;
pub mod protected;
pub mod search;
pub mod session;
pub mod setup;
pub mod skills;
#[cfg(test)]
mod tests {
    use super::database::{
        add_contractor, add_organization, add_profile_fields, archive_contractor, create_tables,
        get_contractors, update_contractor_details, update_contractor_name,
    };

    use rusqlite::Connection;

    // TEST 1: Check database tables
    #[test]
    fn test_create_tables() {
        let conn = Connection::open_in_memory().unwrap();

        create_tables(&conn).unwrap();

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master
             WHERE type = 'table'
             AND name IN ('organizations', 'contractors')",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 2);
    }

    // TEST 2: Add a contractor
    #[test]
    fn test_add_contractor() {
        let conn = Connection::open_in_memory().unwrap();
        create_tables(&conn).unwrap();

        let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi").unwrap();

        let contractor_id = add_contractor(&conn, "Jordan Lee", org_id).unwrap();

        let saved_name: String = conn
            .query_row(
                "SELECT full_name FROM contractors WHERE id = ?1",
                [contractor_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(saved_name, "Jordan Lee");
    }

    // TEST 3: Update a contractor
    #[test]
    fn test_update_contractor() {
        let conn = Connection::open_in_memory().unwrap();
        create_tables(&conn).unwrap();

        let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi").unwrap();

        let contractor_id = add_contractor(&conn, "Jordan Lee", org_id).unwrap();

        let updated = update_contractor_name(&conn, contractor_id, "Jordan M. Lee").unwrap();

        assert!(updated);

        let new_name: String = conn
            .query_row(
                "SELECT full_name FROM contractors WHERE id = ?1",
                [contractor_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(new_name, "Jordan M. Lee");
    } // Closes the Update test

    // TEST 4: Archive a contractor
    #[test]
    fn test_archive_contractor() {
        let conn = Connection::open_in_memory().unwrap();

        create_tables(&conn).unwrap();
        add_profile_fields(&conn).unwrap();

        // Create a fictional organization
        let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi").unwrap();

        // Add a fictional contractor
        let contractor_id = add_contractor(&conn, "Jordan Lee", org_id).unwrap();

        // Archive the contractor
        let archived = archive_contractor(&conn, contractor_id).unwrap();

        assert!(archived);

        // Check that the contractor is hidden
        let active_contractors = get_contractors(&conn).unwrap();

        assert_eq!(active_contractors.len(), 0);

        // Verify the record still exists
        let total: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM contractors WHERE id = ?1",
                [contractor_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(total, 1);

        // Verify the archive date was saved
        let archived_at: Option<String> = conn
            .query_row(
                "SELECT archived_at FROM contractors WHERE id = ?1",
                [contractor_id],
                |row| row.get(0),
            )
            .unwrap();

        assert!(archived_at.is_some());
    }
    #[test]
    fn test_update_contractor_details() {
        let conn = Connection::open_in_memory().unwrap();

        // Create tables and apply the profile migration
        create_tables(&conn).unwrap();
        add_profile_fields(&conn).unwrap();

        // Create a fictional organization
        let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi").unwrap();

        // Create a fictional contractor
        let contractor_id = add_contractor(&conn, "Jordan Lee", org_id).unwrap();

        // Update the contractor's details
        let updated = update_contractor_details(
            &conn,
            contractor_id,
            "Systems Engineer",
            "jordan.lee@example.com",
            "202-555-0100",
        )
        .unwrap();

        assert!(updated);

        // Retrieve the information from SQLite
        let details: (String, String, String) = conn
            .query_row(
                "SELECT role, email, phone
         FROM contractors WHERE id = ?1",
                [contractor_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();

        // Verify all three fields were saved
        assert_eq!(details.0, "Systems Engineer");
        assert_eq!(details.1, "jordan.lee@example.com");
        assert_eq!(details.2, "202-555-0100");
    }
    // TEST 6: Retrieve a complete contractor profile
    #[test]
    fn test_get_contractor_details() {
        let conn = Connection::open_in_memory().unwrap();

        // Create database tables and new fields
        create_tables(&conn).unwrap();
        add_profile_fields(&conn).unwrap();

        // Create fictional organization
        let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi").unwrap();

        // Create fictional contractor
        let contractor_id = add_contractor(&conn, "Jordan Lee", org_id).unwrap();

        // Save additional profile information
        update_contractor_details(
            &conn,
            contractor_id,
            "Systems Engineer",
            "jordan.lee@example.com",
            "202-555-0100",
        )
        .unwrap();

        // Retrieve the contractor
        let contractors = get_contractors(&conn).unwrap();

        // Verify we retrieved one contractor
        assert_eq!(contractors.len(), 1);

        let contractor = &contractors[0];

        // Check every saved field
        assert_eq!(contractor.full_name, "Jordan Lee");
        assert_eq!(contractor.role.as_deref(), Some("Systems Engineer"));
        assert_eq!(contractor.email.as_deref(), Some("jordan.lee@example.com"));
        assert_eq!(contractor.phone.as_deref(), Some("202-555-0100"));
        assert_eq!(
            contractor.organization_name.as_deref(),
            Some("Example Defense LLC")
        );
        assert_eq!(contractor.region.as_deref(), Some("East Nairobi"));
        assert_eq!(contractor.status, "Active");
    } // Closes test_get_contractor_details
} // Closes mod tests

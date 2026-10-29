use rusqlite::Connection;

use secure_crm_backend::admin::{admin_exists, create_first_admin, verify_admin_login};

use secure_crm_backend::setup::initialize_database;

#[test]
fn test_first_time_admin_setup() -> Result<(), Box<dyn std::error::Error>> {
    // Create a temporary database
    let conn = Connection::open_in_memory()?;

    // Initialize all CRM tables
    initialize_database(&conn)?;

    // First launch: no administrator exists
    assert!(!admin_exists(&conn)?);

    // Create a fictional administrator
    let created = create_first_admin(&conn, "ExampleSecurePassword123!")?;

    assert!(created);

    // Now an administrator exists
    assert!(admin_exists(&conn)?);

    // Correct password works
    assert!(verify_admin_login(&conn, "ExampleSecurePassword123!")?);

    // Incorrect password fails
    assert!(!verify_admin_login(&conn, "WrongPassword123!")?);

    // Cannot create another initial administrator
    let second_attempt = create_first_admin(&conn, "AnotherPassword123!")?;

    assert!(!second_attempt);

    Ok(())
}

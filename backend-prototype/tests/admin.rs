use rusqlite::Connection;

use secure_crm_backend::admin::{create_admin_table, create_first_admin, verify_admin_login};

#[test]
fn test_local_admin_login() -> Result<(), Box<dyn std::error::Error>> {
    // Temporary test database
    let conn = Connection::open_in_memory()?;
    create_admin_table(&conn)?;

    // Login fails before an account exists
    assert!(!verify_admin_login(&conn, "ExampleSecurePassword123!")?);

    // Create a fictional administrator
    let created = create_first_admin(&conn, "ExampleSecurePassword123!")?;

    assert!(created);

    // Correct password works
    assert!(verify_admin_login(&conn, "ExampleSecurePassword123!")?);

    // Incorrect password fails
    assert!(!verify_admin_login(&conn, "WrongPassword123!")?);

    // Prevent creating another administrator
    let created_again = create_first_admin(&conn, "DifferentPassword123!")?;

    assert!(!created_again);

    // Original password still works
    assert!(verify_admin_login(&conn, "ExampleSecurePassword123!")?);

    // Confirm plaintext password was not stored
    let stored_hash: String = conn.query_row(
        "SELECT password_hash FROM local_admin WHERE id = 1",
        [],
        |row| row.get(0),
    )?;

    assert!(stored_hash.starts_with("$argon2id$"));
    assert_ne!(stored_hash, "ExampleSecurePassword123!");

    Ok(())
}

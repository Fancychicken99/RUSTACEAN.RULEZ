use rusqlite::Connection;
use std::time::Duration;

use secure_crm_backend::admin::create_first_admin;
use secure_crm_backend::session::SessionManager;
use secure_crm_backend::setup::initialize_database;

#[test]
fn test_admin_session() -> Result<(), Box<dyn std::error::Error>> {
    // Use a temporary database
    let conn = Connection::open_in_memory()?;
    initialize_database(&conn)?;

    // Create a fictional administrator
    create_first_admin(&conn, "ExampleSecurePassword123!")?;

    // Set inactivity timeout to 15 minutes
    let session = SessionManager::new(Duration::from_secs(15 * 60));

    // Before login, access is denied
    assert!(!session.is_authenticated());
    assert!(!session.authorize_action());

    // Wrong password should fail
    assert!(!session.login(&conn, "WrongPassword123!")?);

    // Correct password should succeed
    assert!(session.login(&conn, "ExampleSecurePassword123!")?);

    assert!(session.is_authenticated());

    // An authenticated action is allowed
    assert!(session.authorize_action());

    // Logout removes access
    session.logout();

    assert!(!session.is_authenticated());
    assert!(!session.authorize_action());

    // Test immediate expiration without waiting
    let expired_session = SessionManager::new(Duration::ZERO);

    assert!(expired_session.login(&conn, "ExampleSecurePassword123!")?);

    assert!(!expired_session.is_authenticated());
    assert!(!expired_session.authorize_action());

    Ok(())
}

use rusqlite::Connection;
use std::time::Duration;

use secure_crm_backend::admin::create_first_admin;
use secure_crm_backend::database::{add_contractor, add_organization};
use secure_crm_backend::protected::list_contractors_if_authenticated;
use secure_crm_backend::session::SessionManager;
use secure_crm_backend::setup::initialize_database;

#[test]
fn test_protected_contractor_access() -> Result<(), Box<dyn std::error::Error>> {
    // Temporary test database
    let conn = Connection::open_in_memory()?;
    initialize_database(&conn)?;

    // Create fictional contractor information
    let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi")?;

    add_contractor(&conn, "Jordan Lee", org_id)?;

    // Create fictional administrator
    create_first_admin(&conn, "ExampleSecurePassword123!")?;

    // Create a session with a 15-minute timeout
    let session = SessionManager::new(Duration::from_secs(15 * 60));

    // BEFORE LOGIN: contractor information is blocked
    let before_login = list_contractors_if_authenticated(&conn, &session);

    assert!(before_login.is_err());

    // Log in successfully
    let logged_in = session.login(&conn, "ExampleSecurePassword123!")?;

    assert!(logged_in);

    // AFTER LOGIN: contractor information is available
    let contractors = list_contractors_if_authenticated(&conn, &session)?;

    assert_eq!(contractors.len(), 1);
    assert_eq!(contractors[0].full_name, "Jordan Lee");

    // Log out
    session.logout();

    // AFTER LOGOUT: contractor information is blocked again
    let after_logout = list_contractors_if_authenticated(&conn, &session);

    assert!(after_logout.is_err());

    Ok(())
}

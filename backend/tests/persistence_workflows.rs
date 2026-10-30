//! Backend integration coverage, not desktop UI/Tauri E2E coverage.
use rusqlite::Connection;
use secure_crm_backend::{
    database::{
        add_contractor, add_organization, archive_contractor, get_contractors,
        update_contractor_details, update_contractor_name,
    },
    search::search_contractors,
    setup::initialize_database,
    skills::{add_skill, assign_skill},
};
use std::{error::Error, path::Path};

fn open_database(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    initialize_database(&conn)?;
    Ok(conn)
}

#[test]
fn create_edit_archive_survive_database_reopen() -> Result<(), Box<dyn Error>> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("workflow.db");
    let id = {
        let conn = open_database(&path)?;
        let org = add_organization(&conn, "Fictional Aurora Workshop", "North America")?;
        let id = add_contractor(&conn, "Fictional Rowan Finch", org)?;
        update_contractor_details(&conn, id, "Engineer", "rowan@example.com", "202-555-0100")?;
        id
    };
    {
        let conn = open_database(&path)?;
        let records = get_contractors(&conn)?;
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].id, id);
        assert_eq!(records[0].full_name, "Fictional Rowan Finch");
        assert_eq!(records[0].email.as_deref(), Some("rowan@example.com"));
        assert!(update_contractor_name(&conn, id, "Fictional Rowan Vale")?);
        assert!(update_contractor_details(
            &conn,
            id,
            "Planner",
            "rowan.vale@example.com",
            "202-555-0101"
        )?);
    }
    {
        let conn = open_database(&path)?;
        let records = get_contractors(&conn)?;
        assert_eq!(records[0].full_name, "Fictional Rowan Vale");
        assert_eq!(records[0].role.as_deref(), Some("Planner"));
        assert_eq!(records[0].email.as_deref(), Some("rowan.vale@example.com"));
        assert_eq!(records[0].phone.as_deref(), Some("202-555-0101"));
        assert!(archive_contractor(&conn, id)?);
    }
    let conn = open_database(&path)?;
    assert!(get_contractors(&conn)?.is_empty());
    assert!(!update_contractor_name(&conn, id, "Should not change")?);
    assert!(!archive_contractor(&conn, id)?);
    let retained: String = conn.query_row(
        "SELECT full_name FROM contractors WHERE id = ?1 AND archived_at IS NOT NULL",
        [id],
        |row| row.get(0),
    )?;
    assert_eq!(retained, "Fictional Rowan Vale");
    Ok(())
}

#[test]
fn combined_filters_and_foreign_keys_survive_reopen() -> Result<(), Box<dyn Error>> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("filters.db");
    let matching_id = {
        let conn = open_database(&path)?;
        let north = add_organization(&conn, "Fictional Northern Workshop", "North America")?;
        let south = add_organization(&conn, "Fictional Southern Workshop", "South America")?;
        let matching = add_contractor(&conn, "Fictional Avery Finch", north)?;
        let other_region = add_contractor(&conn, "Fictional Blair Finch", south)?;
        add_contractor(&conn, "Fictional Casey Finch", north)?;
        let archived = add_contractor(&conn, "Fictional Drew Finch", north)?;
        let skill = add_skill(&conn, "Planning")?;
        for id in [matching, other_region, archived] {
            assign_skill(&conn, id, skill)?;
        }
        archive_contractor(&conn, archived)?;
        matching
    };
    let conn = open_database(&path)?;
    let records = search_contractors(&conn, Some(" north america "), Some(" planning "))?;
    assert_eq!(records.len(), 1);
    assert_eq!(records[0].id, matching_id);
    assert!(search_contractors(&conn, Some("Europe"), Some("Planning"))?.is_empty());
    assert_eq!(search_contractors(&conn, None, None)?.len(), 3);
    assert!(matches!(
        add_contractor(&conn, "Fictional Invalid Organization", -1),
        Err(rusqlite::Error::SqliteFailure(error, _))
            if error.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_FOREIGNKEY
    ));
    assert_eq!(get_contractors(&conn)?.len(), 3);
    Ok(())
}

#[test]
fn persisted_admin_requires_new_login_after_reopen() -> Result<(), Box<dyn Error>> {
    use secure_crm_backend::{
        admin::create_first_admin, protected::list_contractors_if_authenticated,
        session::SessionManager,
    };
    use std::time::Duration;

    let directory = tempfile::tempdir()?;
    let path = directory.path().join("authentication.db");
    // Synthetic test credential, never used for an application account.
    let password = "fictional-test-only-password";
    {
        let conn = open_database(&path)?;
        assert!(create_first_admin(&conn, password)?);
        let org = add_organization(&conn, "Fictional Login Workshop", "Europe")?;
        add_contractor(&conn, "Fictional Robin Finch", org)?;
        let session = SessionManager::new(Duration::from_secs(60));
        assert!(session.login(&conn, password)?);
        assert_eq!(
            list_contractors_if_authenticated(&conn, &session)
                .unwrap()
                .len(),
            1
        );
    }
    let conn = open_database(&path)?;
    let session = SessionManager::new(Duration::from_secs(60));
    assert!(list_contractors_if_authenticated(&conn, &session).is_err());
    assert!(!session.login(&conn, "incorrect-test-password")?);
    assert!(list_contractors_if_authenticated(&conn, &session).is_err());
    assert!(!create_first_admin(&conn, "replacement-test-password")?);
    assert!(session.login(&conn, password)?);
    assert_eq!(
        list_contractors_if_authenticated(&conn, &session)
            .unwrap()
            .len(),
        1
    );
    session.logout();
    assert!(list_contractors_if_authenticated(&conn, &session).is_err());
    Ok(())
}

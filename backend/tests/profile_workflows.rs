use rusqlite::Connection;
use secure_crm_backend::{
    database::{archive_organization, get_contractor, get_contractors},
    profiles::{
        MAX_SAFE_ID, ProfileFields, archive_profile, create_organization, create_profile,
        update_profile,
    },
    setup::initialize_database,
};

fn fields(name: &str) -> ProfileFields {
    ProfileFields {
        full_name: name.to_string(),
        prefix: None,
        first_name: None,
        middle_name: None,
        last_name: None,
        suffix: None,
        role: Some("Engineer".to_string()),
        email: Some("test@example.com".to_string()),
        phone: Some("+12025550123".to_string()),
    }
}

#[test]
fn complete_profile_and_archive_survive_reopen_without_losing_organization_identity() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("profiles.db");
    let mut conn = Connection::open(&path).unwrap();
    initialize_database(&conn).unwrap();
    let first = create_organization(
        &mut conn,
        "Fictional Shared Name".into(),
        Some("North".into()),
    )
    .unwrap();
    let second = create_organization(
        &mut conn,
        "Fictional Shared Name".into(),
        Some("South".into()),
    )
    .unwrap();
    assert_ne!(first.id, second.id);
    let saved = create_profile(&mut conn, second.id, fields(" Fictional Rowan Finch ")).unwrap();
    assert_eq!(saved.full_name, "Fictional Rowan Finch");
    assert_eq!(saved.role.as_deref(), Some("Engineer"));
    assert_eq!(saved.organization_id, Some(second.id));
    assert_eq!(saved.region.as_deref(), Some("South"));
    let mut edited = fields("Fictional Rowan Vale");
    edited.role = Some("   ".into());
    edited.email = None;
    edited.phone = Some(" 202-555-0101 ".into());
    let updated = update_profile(&mut conn, saved.id, edited).unwrap();
    assert_eq!(updated.organization_id, Some(second.id));
    assert_eq!(updated.status, "Active");
    assert!(updated.role.is_none() && updated.email.is_none());
    drop(conn);
    let conn = Connection::open(&path).unwrap();
    initialize_database(&conn).unwrap();
    let reopened = get_contractor(&conn, saved.id).unwrap().unwrap();
    assert_eq!(reopened.full_name, "Fictional Rowan Vale");
    assert_eq!(reopened.phone.as_deref(), Some("202-555-0101"));
    archive_profile(&conn, saved.id).unwrap();
    assert!(archive_profile(&conn, saved.id).is_err());
    drop(conn);
    let mut conn = Connection::open(&path).unwrap();
    initialize_database(&conn).unwrap();
    assert!(get_contractors(&conn).unwrap().is_empty());
    assert!(update_profile(&mut conn, saved.id, fields("Do not change")).is_err());
    let stored: (String, Option<String>) = conn
        .query_row(
            "SELECT full_name, archived_at FROM contractors WHERE id = ?1",
            [saved.id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(stored.0, "Fictional Rowan Vale");
    assert!(stored.1.is_some());
}

#[test]
fn validation_archived_organizations_and_write_failures_do_not_leave_partial_profiles() {
    let mut conn = Connection::open_in_memory().unwrap();
    initialize_database(&conn).unwrap();
    let org =
        create_organization(&mut conn, "Fictional Workshop".into(), Some(" ".into())).unwrap();
    assert!(org.region.is_none());
    assert!(create_organization(&mut conn, "  ".into(), None).is_err());
    assert!(create_profile(&mut conn, org.id, fields(" ")).is_err());
    assert!(create_profile(&mut conn, org.id, fields("Bad\nName")).is_err());
    assert!(create_profile(&mut conn, MAX_SAFE_ID + 1, fields("Fictional Invalid")).is_err());
    assert!(create_profile(&mut conn, 999, fields("Fictional Invalid")).is_err());
    let mut invalid = fields("Fictional Invalid");
    invalid.email = Some("not an email".into());
    assert!(create_profile(&mut conn, org.id, invalid).is_err());
    // Fail the SECOND write of create_profile; the first insert must roll back.
    conn.execute_batch("CREATE TRIGGER reject_details BEFORE UPDATE OF role ON contractors BEGIN SELECT RAISE(ABORT, 'test failure'); END;").unwrap();
    assert!(create_profile(&mut conn, org.id, fields("Fictional Rollback")).is_err());
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM contractors", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count, 0);
    conn.execute_batch("DROP TRIGGER reject_details;").unwrap();
    archive_organization(&conn, org.id).unwrap();
    assert!(create_profile(&mut conn, org.id, fields("Fictional Archived Org")).is_err());
}
#[test]
fn contractor_split_names_are_saved() -> Result<(), Box<dyn std::error::Error>> {
    use rusqlite::Connection;
    use secure_crm_backend::profiles::{ProfileFields, create_profile};
    use secure_crm_backend::setup::initialize_database;

    let directory = tempfile::tempdir()?;
    let path = directory.path().join("split_names.db");

    let mut conn = Connection::open(&path)?;
    initialize_database(&conn)?;

    conn.execute(
        "INSERT INTO organizations (name, region) VALUES (?1, ?2)",
        rusqlite::params!["Fictional Test Organization", "North America"],
    )?;

    let organization_id = conn.last_insert_rowid();

    let profile = ProfileFields {
        full_name: String::new(),
        prefix: Some("Dr.".into()),
        first_name: Some("Fictional".into()),
        middle_name: Some("Rowan".into()),
        last_name: Some("Finch".into()),
        suffix: Some("Jr.".into()),
        role: Some("Engineer".into()),
        email: Some("fictional@example.com".into()),
        phone: Some("+12025550123".into()),
    };

    let contractor = create_profile(&mut conn, organization_id, profile)?;

    drop(conn);

    let conn = Connection::open(&path)?;

    let names: (
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ) = conn.query_row(
        "SELECT prefix, first_name, middle_name, last_name, suffix
             FROM contractors WHERE id = ?1",
        [contractor.id],
        |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        },
    )?;

    assert_eq!(names.0.as_deref(), Some("Dr."));
    assert_eq!(names.1.as_deref(), Some("Fictional"));
    assert_eq!(names.2.as_deref(), Some("Rowan"));
    assert_eq!(names.3.as_deref(), Some("Finch"));
    assert_eq!(names.4.as_deref(), Some("Jr."));

    Ok(())
}
#[test]
fn organization_status_can_be_toggled() -> Result<(), Box<dyn std::error::Error>> {
    use rusqlite::Connection;
    use secure_crm_backend::profiles::set_organization_status;
    use secure_crm_backend::setup::initialize_database;

    let conn = Connection::open_in_memory()?;
    initialize_database(&conn)?;

    conn.execute(
        "INSERT INTO organizations (name, region)
         VALUES (?1, ?2)",
        rusqlite::params!["Fictional Test Organization", "North America"],
    )?;

    let id = conn.last_insert_rowid();

    set_organization_status(&conn, id, "Inactive")?;

    let status: String = conn.query_row(
        "SELECT status FROM organizations WHERE id = ?1",
        [id],
        |row| row.get(0),
    )?;

    assert_eq!(status, "Inactive");

    set_organization_status(&conn, id, "Active")?;

    let status: String = conn.query_row(
        "SELECT status FROM organizations WHERE id = ?1",
        [id],
        |row| row.get(0),
    )?;

    assert_eq!(status, "Active");

    Ok(())
}
#[test]
fn organization_extra_fields_survive_reopen() -> Result<(), Box<dyn std::error::Error>> {
    use secure_crm_backend::profiles::{OrganizationExtraFields, update_organization_extra};

    let directory = tempfile::tempdir()?;
    let path = directory.path().join("organization_extra.db");

    let conn = rusqlite::Connection::open(&path)?;
    initialize_database(&conn)?;

    conn.execute(
        "INSERT INTO organizations (name, region)
         VALUES (?1, ?2)",
        rusqlite::params!["Fictional Test Organization", "North America"],
    )?;

    let id = conn.last_insert_rowid();

    update_organization_extra(
        &conn,
        id,
        OrganizationExtraFields {
            secondary_email: Some("contact@example.com".into()),
            street_address_1: Some("123 Example Street".into()),
            street_address_2: Some("Suite 200".into()),
            city: Some("Nashville".into()),
            state_province: Some("Tennessee".into()),
            country: Some("USA".into()),
        },
    )?;

    drop(conn);

    let conn = rusqlite::Connection::open(&path)?;

    let (email, city, country): (Option<String>, Option<String>, Option<String>) = conn.query_row(
        "SELECT secondary_email, city, country
             FROM organizations WHERE id = ?1",
        [id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    assert_eq!(email.as_deref(), Some("contact@example.com"));
    assert_eq!(city.as_deref(), Some("Nashville"));
    assert_eq!(country.as_deref(), Some("USA"));

    Ok(())
}

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
        details: None,
        full_name: name.to_string(),
        prefix: None,
        first_name: None,
        middle_name: None,
        last_name: None,
        suffix: None,
        role: Some("Engineer".to_string()),
        email: Some("test@example.com".to_string()),
        phone: Some("+12025550123".to_string()),
        extra_information: serde_json::json!({}),
    }
}

#[test]
fn combined_organization_save_rolls_back_database_failure_and_reopens_both_records() {
    use secure_crm_backend::profiles::create_organization_with_contractor;
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("combined.db");
    let mut conn = Connection::open(&path).unwrap();
    initialize_database(&conn).unwrap();
    let mut invalid = fields("Fictional Inline");
    invalid.email = None;
    invalid.phone = None;
    assert!(
        create_organization_with_contractor(
            &mut conn,
            "Invalid Org".into(),
            None,
            None,
            None,
            None,
            Some(invalid)
        )
        .is_err()
    );
    conn.execute_batch("CREATE TRIGGER fail_inline BEFORE UPDATE OF email ON contractors BEGIN SELECT RAISE(ABORT, 'injected write failure'); END;").unwrap();
    assert!(
        create_organization_with_contractor(
            &mut conn,
            "Rollback Org".into(),
            None,
            None,
            None,
            None,
            Some(fields("Fictional Inline"))
        )
        .is_err()
    );
    for table in ["organizations", "contractors"] {
        let count: i64 = conn
            .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 0, "No partial writes in {table}");
    }
    conn.execute_batch("DROP TRIGGER fail_inline").unwrap();
    let org = create_organization_with_contractor(
        &mut conn,
        "Fictional Combined".into(),
        Some("Test Region".into()),
        None,
        None,
        None,
        Some(fields("Fictional Inline")),
    )
    .unwrap();
    drop(conn);
    let conn = Connection::open(&path).unwrap();
    let contractors = get_contractors(&conn).unwrap();
    assert_eq!(contractors.len(), 1);
    assert_eq!(contractors[0].organization_id, Some(org.id));
    assert_eq!(contractors[0].email.as_deref(), Some("test@example.com"));
    assert_eq!(
        secure_crm_backend::database::get_organizations(&conn).unwrap()[0].name,
        "Fictional Combined"
    );
}

#[test]
fn contact_choice_validates_every_supplied_value_without_partial_writes() {
    let mut conn = Connection::open_in_memory().unwrap();
    initialize_database(&conn).unwrap();
    let org = create_organization(&mut conn, "Fictional Contacts".into(), None).unwrap();
    for (email, phone) in [
        (Some("only@example.com"), None),
        (None, Some("+44 20 7946 0958")),
        (None, Some("(202) 555-0101")),
        (Some("both@example.com"), Some("+1 (202) 555-0102")),
    ] {
        let mut profile = fields("Fictional Contact Choice");
        profile.email = email.map(String::from);
        profile.phone = phone.map(String::from);
        let saved = create_profile(&mut conn, org.id, profile).unwrap();
        assert_eq!(saved.email.as_deref(), email);
        assert_eq!(saved.phone.as_deref(), phone);
    }
    let before = get_contractors(&conn).unwrap().len();
    for (email, phone) in [
        (None, None),
        (Some(" "), Some(" ")),
        (Some("not an email"), Some("+44 20 7946 0958")),
        (Some("valid@example.com"), Some("call me")),
        (Some("valid@example.com"), Some("123456")),
        (Some("valid@example.com"), Some("1234567890123456")),
        (Some("valid@example.com"), Some("+02025550101")),
        (Some("valid@example.com"), Some("+44 (20 7946 0958")),
        (Some("valid@example.com"), Some("+44 20+79460958")),
    ] {
        let mut profile = fields("Must Not Save");
        profile.email = email.map(String::from);
        profile.phone = phone.map(String::from);
        assert!(create_profile(&mut conn, org.id, profile).is_err());
        assert_eq!(get_contractors(&conn).unwrap().len(), before);
    }
    let id = get_contractors(&conn).unwrap()[0].id;
    let mut invalid_edit = fields("Must Not Replace");
    invalid_edit.email = None;
    invalid_edit.phone = None;
    assert!(update_profile(&mut conn, id, invalid_edit).is_err());
    assert_eq!(
        get_contractor(&conn, id).unwrap().unwrap().full_name,
        "Fictional Contact Choice"
    );
}

#[test]
fn complete_and_legacy_names_survive_edits_reopen_and_rejected_partial_names() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("name-contract.db");
    let mut conn = Connection::open(&path).unwrap();
    initialize_database(&conn).unwrap();
    let org = create_organization(&mut conn, "Fictional Names".into(), None).unwrap();
    let mut legacy_fields = fields("Fictional Many Middle Name Parts");
    legacy_fields.prefix = Some("Capt.".into());
    legacy_fields.middle_name = Some("Stored middle metadata".into());
    legacy_fields.suffix = Some("PhD".into());
    let legacy = create_profile(&mut conn, org.id, legacy_fields).unwrap();
    let mut legacy_edit = fields(&legacy.full_name);
    legacy_edit.prefix = legacy.prefix.clone();
    legacy_edit.middle_name = legacy.middle_name.clone();
    legacy_edit.suffix = legacy.suffix.clone();
    legacy_edit.phone = None;
    update_profile(&mut conn, legacy.id, legacy_edit).unwrap();
    let mut profile = fields("Ignored when structured names exist");
    profile.prefix = Some(" Capt. ".into());
    profile.first_name = Some(" Fictional ".into());
    profile.middle_name = Some(" Many Middle ".into());
    profile.last_name = Some(" Finch ".into());
    profile.suffix = Some(" PhD ".into());
    profile.email = None;
    profile.phone = Some(" +44 20 7946 0958 ".into());
    let saved = create_profile(&mut conn, org.id, profile).unwrap();
    let mut bad = fields("Cannot bypass the split-name requirement");
    bad.first_name = Some(" ".into());
    bad.last_name = Some("Finch".into());
    assert!(update_profile(&mut conn, saved.id, bad).is_err());
    let mut edited = fields("");
    edited.prefix = Some("Capt.".into());
    edited.first_name = Some("Fictional".into());
    edited.middle_name = Some(" ".into());
    edited.last_name = Some("Finch".into());
    edited.suffix = Some("PhD".into());
    edited.phone = None;
    update_profile(&mut conn, saved.id, edited).unwrap();
    drop(conn);
    let conn = Connection::open(&path).unwrap();
    initialize_database(&conn).unwrap();
    let legacy = get_contractor(&conn, legacy.id).unwrap().unwrap();
    assert_eq!(legacy.full_name, "Fictional Many Middle Name Parts");
    assert!(legacy.first_name.is_none() && legacy.last_name.is_none());
    assert_eq!(legacy.prefix.as_deref(), Some("Capt."));
    assert_eq!(
        legacy.middle_name.as_deref(),
        Some("Stored middle metadata")
    );
    assert_eq!(legacy.suffix.as_deref(), Some("PhD"));
    let saved = get_contractor(&conn, saved.id).unwrap().unwrap();
    assert_eq!(saved.full_name, "Capt. Fictional Finch PhD");
    assert_eq!(saved.prefix.as_deref(), Some("Capt."));
    assert_eq!(saved.first_name.as_deref(), Some("Fictional"));
    assert_eq!(saved.last_name.as_deref(), Some("Finch"));
    assert_eq!(saved.suffix.as_deref(), Some("PhD"));
    assert!(saved.middle_name.is_none() && saved.phone.is_none());
    assert_eq!(saved.email.as_deref(), Some("test@example.com"));
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
        details: None,
        full_name: String::new(),
        prefix: Some("Dr.".into()),
        first_name: Some("Fictional".into()),
        middle_name: Some("Rowan".into()),
        last_name: Some("Finch".into()),
        suffix: Some("Jr.".into()),
        role: Some("Engineer".into()),
        email: Some("fictional@example.com".into()),
        phone: Some("+12025550123".into()),
        extra_information: serde_json::json!({}),
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

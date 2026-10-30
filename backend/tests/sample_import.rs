use rusqlite::Connection;
use secure_crm_backend::{
    database::{get_contractor, get_contractors},
    profiles::{
        ProfileFields, archive_profile, create_organization, create_profile, update_profile,
    },
    seed::{SAMPLE_DATA, import_dataset, import_sample_data},
    setup::initialize_database,
};

fn fields(name: &str) -> ProfileFields {
    ProfileFields {
        full_name: name.into(),
        role: None,
        email: Some("manual@example.com".into()),
        phone: None,
    }
}

#[test]
fn repeated_import_preserves_user_records_edits_archives_skills_and_contact_dates_after_reopen() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("import.db");
    let mut conn = Connection::open(&path).unwrap();
    initialize_database(&conn).unwrap();
    let manual_org = create_organization(
        &mut conn,
        "Fictional Aurora Workshop".into(),
        Some("East Nairobi".into()),
    )
    .unwrap();
    let manual = create_profile(&mut conn, manual_org.id, fields("Fictional Rowan Finch")).unwrap();
    let report = import_sample_data(&mut conn).unwrap();
    assert_eq!(
        (report.organizations_added, report.contractors_added),
        (6, 60)
    );
    assert_eq!(get_contractors(&conn).unwrap().len(), 61);
    let imported_id: i64 = conn
        .query_row(
            "SELECT contractor_id FROM synthetic_contractors WHERE record_key='contractor-001'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_ne!(imported_id, manual.id);
    update_profile(
        &mut conn,
        imported_id,
        fields("Fictional User Edited Sample"),
    )
    .unwrap();
    archive_profile(&conn, imported_id).unwrap();
    let contacts: i64 = conn
        .query_row("SELECT COUNT(*) FROM contact_events", [], |r| r.get(0))
        .unwrap();
    let skills: i64 = conn
        .query_row("SELECT COUNT(*) FROM contractor_skills", [], |r| r.get(0))
        .unwrap();
    let statuses: i64 = conn
        .query_row("SELECT COUNT(DISTINCT status) FROM contractors", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!((contacts, skills, statuses), (48, 120, 4));
    drop(conn);
    let mut conn = Connection::open(&path).unwrap();
    initialize_database(&conn).unwrap();
    let report = import_sample_data(&mut conn).unwrap();
    assert_eq!(
        (
            report.organizations_added,
            report.contractors_added,
            report.organizations_skipped,
            report.contractors_skipped
        ),
        (0, 0, 6, 60)
    );
    let edited: (String, Option<String>) = conn
        .query_row(
            "SELECT full_name,archived_at FROM contractors WHERE id=?1",
            [imported_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(edited.0, "Fictional User Edited Sample");
    assert!(edited.1.is_some());
    assert_eq!(
        get_contractor(&conn, manual.id)
            .unwrap()
            .unwrap()
            .email
            .as_deref(),
        Some("manual@example.com")
    );
    assert_eq!(get_contractors(&conn).unwrap().len(), 60);
    assert_eq!(
        conn.query_row("SELECT COUNT(*) FROM contact_events", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        contacts
    );
    assert_eq!(
        conn.query_row("SELECT COUNT(*) FROM contractor_skills", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        skills
    );
}

#[test]
fn invalid_late_record_and_database_failure_roll_back_the_whole_import() {
    let mut conn = Connection::open_in_memory().unwrap();
    initialize_database(&conn).unwrap();
    let mut dataset: serde_json::Value = serde_json::from_str(SAMPLE_DATA).unwrap();
    dataset["contractors"][59]["profile"]["email"] = "not-real@invalid.test".into();
    assert!(import_dataset(&mut conn, &dataset.to_string()).is_err());
    assert_eq!(
        conn.query_row("SELECT COUNT(*) FROM contractors", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        0
    );
    assert_eq!(
        conn.query_row("SELECT COUNT(*) FROM organizations", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        0
    );
    conn.execute_batch("CREATE TRIGGER fail_sample BEFORE INSERT ON contractors WHEN NEW.email='contractor030@example.com' BEGIN SELECT RAISE(ABORT,'private test database error'); END;").unwrap();
    let error = import_sample_data(&mut conn).unwrap_err().to_string();
    assert_eq!(error, "Unable to import sample data");
    for table in ["contractors", "organizations", "skills", "contact_events"] {
        let count: i64 = conn
            .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }
}

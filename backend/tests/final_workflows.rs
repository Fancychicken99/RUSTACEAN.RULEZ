use rusqlite::Connection;
use secure_crm_backend::{profiles, setup::initialize_database, vault::VaultStore, workspace};

fn profile() -> profiles::ProfileFields {
    serde_json::from_value(serde_json::json!({"first_name":"Rowan","last_name":"Finch","email":"rowan@example.com","details":{"address":{"country":"United Kingdom","city":"London"},"extra_information":{"Background":{"type":"long_text","value":"Synthetic only\nSecond line"}}}})).unwrap()
}
fn image() -> Vec<u8> {
    let mut bytes = std::io::Cursor::new(Vec::new());
    image::DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(
        8,
        8,
        image::Rgba([20, 100, 120, 255]),
    ))
    .write_to(&mut bytes, image::ImageFormat::Png)
    .unwrap();
    bytes.into_inner()
}

#[test]
fn encrypted_recovery_and_portable_round_trip_preserve_records_images_and_cancelled_target() {
    let source = tempfile::tempdir().unwrap();
    let source_path = source.path().join("crm.db");
    let vault = VaultStore::open(&source_path).unwrap();
    let original_key = vault.setup("original synthetic password").unwrap();
    let mut unlocked = vault
        .unlock("original synthetic password")
        .unwrap()
        .unwrap();
    let org = profiles::create_organization(
        &mut unlocked.conn,
        "Aurora Demonstration".into(),
        Some("Global".into()),
    )
    .unwrap();
    let mut fields = profile();
    fields.details.as_mut().unwrap().image =
        Some(secure_crm_backend::media::ImageUpload { bytes: image() });
    let record = profiles::create_profile(&mut unlocked.conn, org.id, fields).unwrap();
    let original_image =
        secure_crm_backend::media::load(&unlocked.conn, workspace::Kind::Contractor, record.id)
            .unwrap();
    assert!(original_image.is_some());
    let manifest: serde_json::Value =
        serde_json::from_slice(&std::fs::read(source_path.with_extension("vault.json")).unwrap())
            .unwrap();
    let encrypted = source
        .path()
        .join(manifest["database_file"].as_str().unwrap());
    assert!(
        !std::fs::read(&encrypted)
            .unwrap()
            .starts_with(b"SQLite format 3")
    );
    assert!(
        Connection::open(&encrypted)
            .unwrap()
            .query_row("SELECT COUNT(*) FROM contractors", [], |r| r
                .get::<_, i64>(0))
            .is_err()
    );
    let replacement = vault
        .recover(&original_key, "new synthetic password")
        .unwrap();
    assert!(
        vault
            .unlock("original synthetic password")
            .unwrap()
            .is_none()
    );
    assert!(
        vault
            .recover(&original_key, "another synthetic password")
            .is_err()
    );
    assert!(vault.unlock("new synthetic password").unwrap().is_some());
    assert!(
        vault
            .recover(&replacement, "recovered synthetic password")
            .is_ok()
    );
    let archive = source.path().join("test.hharbor");
    let counts = vault
        .export_to(&unlocked.conn, &archive, "synthetic transfer password")
        .unwrap();
    assert_eq!(counts.contractors, 1);
    assert_eq!(counts.images, 1);
    let target = tempfile::tempdir().unwrap();
    let target_vault = VaultStore::open(&target.path().join("crm.db")).unwrap();
    target_vault.setup("target original password").unwrap();
    assert!(
        target_vault
            .import_from(
                &archive,
                "wrong password",
                "imported synthetic password",
                |_| true
            )
            .is_err()
    );
    assert!(
        target_vault
            .import_from(
                &archive,
                "synthetic transfer password",
                "imported synthetic password",
                |_| false
            )
            .unwrap()
            .is_none()
    );
    assert!(
        target_vault
            .unlock("target original password")
            .unwrap()
            .is_some()
    );
    let result = target_vault
        .import_from(
            &archive,
            "synthetic transfer password",
            "imported synthetic password",
            |info| info.contractors == 1 && info.images == 1,
        )
        .unwrap()
        .unwrap();
    assert!(result.backup_name.is_some());
    assert!(
        target_vault
            .unlock("target original password")
            .unwrap()
            .is_none()
    );
    let imported = target_vault
        .unlock("imported synthetic password")
        .unwrap()
        .unwrap();
    let records = secure_crm_backend::database::get_contractors(&imported.conn).unwrap();
    assert_eq!(records.len(), 1);
    assert_eq!(records[0].city.as_deref(), Some("London"));
    assert_eq!(
        secure_crm_backend::media::load(&imported.conn, workspace::Kind::Contractor, record.id)
            .unwrap(),
        original_image
    );
    assert!(
        target_vault
            .recover(&result.recovery_key, "round trip recovered password")
            .is_ok()
    );
}

#[test]
fn sql_search_taxonomy_history_and_archives_survive_reopen() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("crm.db");
    let mut conn = Connection::open(&path).unwrap();
    initialize_database(&conn).unwrap();
    let org =
        profiles::create_organization(&mut conn, "Aurora".into(), Some("Global".into())).unwrap();
    let other = profiles::create_organization(&mut conn, "Juniper".into(), None).unwrap();
    let record = profiles::create_profile(&mut conn, org.id, profile()).unwrap();
    workspace::save_taxonomy(
        &mut conn,
        workspace::Kind::Contractor,
        record.id,
        vec!["Planning".into()],
        vec!["Logistics".into()],
    )
    .unwrap();
    let search = || workspace::Search {
        region: Some("Global".into()),
        country: Some("kingdom".into()),
        city: Some("London".into()),
        tag: Some("Planning".into()),
        skill: Some("Logistics".into()),
        query: Some("Fynch".into()),
        due_days: Some(30),
        ..Default::default()
    };
    assert_eq!(
        workspace::search(&conn, search()).unwrap().len(),
        1,
        "SOUNDEX plus every combined filter and never-contacted rule"
    );
    secure_crm_backend::contacts::record_contact(
        &conn,
        record.id,
        "Other",
        "Synthetic follow-up\nA second line",
    )
    .unwrap();
    assert!(workspace::search(&conn, search()).unwrap().is_empty());
    profiles::set_contractor_status(&conn, record.id, "Retired").unwrap();
    secure_crm_backend::history::transfer_contractor(&mut conn, record.id, other.id).unwrap();
    profiles::archive_profile(&conn, record.id).unwrap();
    let snapshot = workspace::snapshot(&conn).unwrap();
    assert_eq!(snapshot.archives.len(), 1);
    assert!(snapshot.history.iter().any(|e| e.event == "Transfer"));
    assert!(snapshot.history.iter().any(|e| e.event == "Status"));
    drop(conn);
    let conn = Connection::open(&path).unwrap();
    workspace::restore(&conn, workspace::Kind::Contractor, record.id).unwrap();
    let restored = secure_crm_backend::database::get_contractor(&conn, record.id)
        .unwrap()
        .unwrap();
    assert_eq!(restored.organization_id, Some(other.id));
    assert_eq!(restored.status, "Retired");
    assert_eq!(restored.days_since_last_contact, Some(0));
    assert_eq!(workspace::snapshot(&conn).unwrap().contacts.len(), 1);
}

#[test]
fn plaintext_migration_preserves_original_until_verified_cleanup() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("crm.db");
    {
        let mut conn = Connection::open(&path).unwrap();
        initialize_database(&conn).unwrap();
        secure_crm_backend::admin::create_first_admin(&conn, "legacy synthetic password").unwrap();
        let org = profiles::create_organization(&mut conn, "Legacy Aurora".into(), None).unwrap();
        profiles::create_profile(&mut conn, org.id, profile()).unwrap();
    }
    let vault = VaultStore::open(&path).unwrap();
    assert!(!vault.status().unwrap().encrypted);
    assert!(vault.unlock("incorrect").unwrap().is_none());
    let unlocked = vault.unlock("legacy synthetic password").unwrap().unwrap();
    assert!(unlocked.recovery_key.is_some());
    assert!(path.exists());
    assert!(vault.status().unwrap().legacy_copy_present);
    assert_eq!(
        secure_crm_backend::database::get_contractors(&unlocked.conn)
            .unwrap()
            .len(),
        1
    );
    vault.remove_legacy_copy(&unlocked.conn).unwrap();
    assert!(!path.exists());
    assert!(vault.unlock("legacy synthetic password").unwrap().is_some());
}

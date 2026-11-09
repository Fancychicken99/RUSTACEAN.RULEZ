use rusqlite::Connection;
use secure_crm_backend::{database, history, profiles, setup::initialize_database};

#[test]
fn released_v6_workspace_preserves_records_and_adds_lifecycle_history() -> rusqlite::Result<()> {
    let mut conn = Connection::open_in_memory()?;
    initialize_database(&conn)?;
    let org = profiles::create_organization(&mut conn, "Example Studio".into(), None).unwrap();
    let fields = serde_json::from_value(serde_json::json!({"first_name":"Rowan","last_name":"Test","email":"rowan@example.com","details":{"extra_information":{"Notes":{"type":"long_text","value":"Keep this detail"}}}})).unwrap();
    let person = profiles::create_profile(&mut conn, org.id, fields).unwrap();
    // Reconstruct the released schema: v6 has details/media/audit tables, but no
    // company-closure marker, lifecycle initialization triggers or field history.
    let names = conn.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND (name LIKE 'audit_%' OR name IN ('contractor_created_dates','organization_created_dates'))")?
        .query_map([], |row| row.get::<_, String>(0))?.collect::<rusqlite::Result<Vec<_>>>()?;
    for name in names {
        conn.execute_batch(&format!("DROP TRIGGER \"{}\";", name.replace('"', "\"\"")))?;
    }
    conn.execute_batch("DROP TABLE record_change_history; ALTER TABLE organizations DROP COLUMN out_of_business_at; PRAGMA user_version=6;")?;
    initialize_database(&conn)?;
    initialize_database(&conn)?;
    assert_eq!(
        conn.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0))?,
        7
    );
    let saved = database::get_contractor(&conn, person.id)?.unwrap();
    assert_eq!(
        saved.extra_information["Notes"]["value"],
        "Keep this detail"
    );
    assert!(saved.created_at.is_some());
    let closed = profiles::set_organization_status(&conn, org.id, "Out of Business").unwrap();
    assert_eq!(closed.status, "Out of Business");
    assert!(closed.out_of_business_at.is_some());
    assert!(!history::get_record_history(&conn, "organization", org.id)?.is_empty());
    assert_eq!(
        profiles::set_organization_status(&conn, org.id, "Active")
            .unwrap()
            .status,
        "Active"
    );
    profiles::archive_profile(&conn, person.id).unwrap();
    assert!(
        database::get_archived_records(&conn)?
            .iter()
            .any(|row| row.id == person.id && row.entity_type == "Contractor")
    );
    Ok(())
}

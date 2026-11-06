use rusqlite::Connection;

use secure_crm_backend::database::{
    add_contractor, add_organization, add_organization_archive_field, create_tables,
};

use secure_crm_backend::skills::{add_skill, assign_skill, create_skill_tables};

use secure_crm_backend::search::search_contractors;

#[test]
fn test_combined_search() -> rusqlite::Result<()> {
    let conn = Connection::open_in_memory()?;

    create_tables(&conn)?;
    add_organization_archive_field(&conn)?;
    create_skill_tables(&conn)?;

    let east = add_organization(&conn, "Example Defense LLC", "East Nairobi")?;

    let north = add_organization(&conn, "Global Engineering Group", "North America")?;

    let jordan = add_contractor(&conn, "Jordan Lee", east)?;
    let alex = add_contractor(&conn, "Alex Morgan", east)?;
    let morgan = add_contractor(&conn, "Morgan Reed", north)?;

    let cyber = add_skill(&conn, "Cybersecurity")?;
    let engineering = add_skill(&conn, "Engineering")?;

    assign_skill(&conn, jordan, cyber)?;
    assign_skill(&conn, jordan, engineering)?;
    assign_skill(&conn, alex, engineering)?;
    assign_skill(&conn, morgan, cyber)?;

    // Search by both region and skill
    let results = search_contractors(&conn, Some("east nairobi"), Some("cybersecurity"))?;

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].full_name, "Jordan Lee");

    // Search by region only
    let region_results = search_contractors(&conn, Some("East Nairobi"), None)?;

    assert_eq!(region_results.len(), 2);

    // Search by skill only
    let skill_results = search_contractors(&conn, None, Some("Cybersecurity"))?;

    assert_eq!(skill_results.len(), 2);

    // No filters returns all active records
    let all_results = search_contractors(&conn, None, None)?;

    assert_eq!(all_results.len(), 3);

    Ok(())
}

#[test]
fn sqlite_soundex_is_available() -> Result<(), Box<dyn std::error::Error>> {
    let conn = rusqlite::Connection::open_in_memory()?;

    let (smith, smyth): (String, String) =
        conn.query_row("SELECT soundex('Smith'), soundex('Smyth')", [], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

    assert_eq!(smith, smyth);

    Ok(())
}

#[test]
fn fuzzy_search_finds_similar_last_names() -> Result<(), Box<dyn std::error::Error>> {
    use secure_crm_backend::{
        database::add_organization, search::search_contractors_by_name, setup::initialize_database,
    };

    let conn = rusqlite::Connection::open_in_memory()?;
    initialize_database(&conn)?;

    let org_id = add_organization(&conn, "Fictional Test Organization", "North America")?;

    conn.execute(
        "INSERT INTO contractors
         (full_name, first_name, last_name, organization_id)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params!["Fictional John Smith", "John", "Smith", org_id],
    )?;

    let results = search_contractors_by_name(&conn, "Smyth")?;

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].last_name.as_deref(), Some("Smith"));

    Ok(())
}

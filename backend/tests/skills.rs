use rusqlite::Connection;

use secure_crm_backend::database::{
    add_contractor, add_organization, add_profile_fields, create_tables,
};

use secure_crm_backend::skills::{
    add_skill, assign_skill, create_skill_tables, get_contractors_by_skill,
};

#[test]
fn test_assign_skills() -> rusqlite::Result<()> {
    let conn = Connection::open_in_memory()?;

    // Create database tables
    create_tables(&conn)?;
    create_skill_tables(&conn)?;

    // Create fictional organization
    let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi")?;

    // Create fictional contractor
    let contractor_id = add_contractor(&conn, "Jordan Lee", org_id)?;

    // Create a skill
    let skill_id = add_skill(&conn, "Cybersecurity")?;

    // Assign it to the contractor
    let assigned = assign_skill(&conn, contractor_id, skill_id)?;

    assert!(assigned);

    // Check that the assignment was saved
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM contractor_skills
         WHERE contractor_id = ?1 AND skill_id = ?2",
        [contractor_id, skill_id],
        |row| row.get(0),
    )?;

    assert_eq!(count, 1);

    Ok(())
}

#[test]
fn test_filter_contractors_by_skill() -> rusqlite::Result<()> {
    let conn = Connection::open_in_memory()?;

    // Create tables and contractor profile fields
    create_tables(&conn)?;
    add_profile_fields(&conn)?;
    create_skill_tables(&conn)?;

    // Create fictional organization
    let org_id = add_organization(&conn, "Example Defense LLC", "East Nairobi")?;

    // Create two fictional contractors
    let jordan_id = add_contractor(&conn, "Jordan Lee", org_id)?;

    let alex_id = add_contractor(&conn, "Alex Morgan", org_id)?;

    // Create two different skills
    let cyber_id = add_skill(&conn, "Cybersecurity")?;
    let engineering_id = add_skill(&conn, "Engineering")?;

    // Give each contractor a different skill
    assign_skill(&conn, jordan_id, cyber_id)?;
    assign_skill(&conn, alex_id, engineering_id)?;

    // Search for Cybersecurity
    let results = get_contractors_by_skill(&conn, "cybersecurity")?;

    // Only Jordan Lee should appear
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].full_name, "Jordan Lee");

    // Verify an unknown skill returns no results
    let empty_results = get_contractors_by_skill(&conn, "Unknown Skill")?;

    assert!(empty_results.is_empty());

    Ok(())
}

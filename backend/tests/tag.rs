use rusqlite::Connection;
use secure_crm_backend::{
    setup::initialize_database,
    tags::{
        add_tag, assign_contractor_tag, assign_organization_tag, get_contractor_tags,
        get_organization_tags, remove_contractor_tag, remove_organization_tag,
    },
};

#[test]
fn tags_can_be_assigned_retrieved_and_removed() -> Result<(), Box<dyn std::error::Error>> {
    let conn = Connection::open_in_memory()?;
    initialize_database(&conn)?;

    // Create a fictional organization
    conn.execute(
        "INSERT INTO organizations (name, region)
         VALUES (?1, ?2)",
        ["Fictional Aurora Workshop", "North America"],
    )?;
    let organization_id = conn.last_insert_rowid();

    // Create a fictional contractor
    conn.execute(
        "INSERT INTO contractors (full_name, organization_id)
         VALUES (?1, ?2)",
        rusqlite::params!["Fictional Rowan Finch", organization_id],
    )?;
    let contractor_id = conn.last_insert_rowid();

    // Create a tag
    let tag_id = add_tag(&conn, "Engineering")?;

    // Assign to contractor and organization
    assert!(assign_contractor_tag(&conn, contractor_id, tag_id)?);
    assert!(assign_organization_tag(&conn, organization_id, tag_id)?);

    // Check that duplicate assignments are ignored
    assert!(!assign_contractor_tag(&conn, contractor_id, tag_id)?);
    assert!(!assign_organization_tag(&conn, organization_id, tag_id)?);

    // Retrieve assigned tags
    let contractor_tags = get_contractor_tags(&conn, contractor_id)?;
    let organization_tags = get_organization_tags(&conn, organization_id)?;

    assert_eq!(contractor_tags.len(), 1);
    assert_eq!(contractor_tags[0].name, "Engineering");

    assert_eq!(organization_tags.len(), 1);
    assert_eq!(organization_tags[0].name, "Engineering");

    // Remove assignments
    assert!(remove_contractor_tag(&conn, contractor_id, tag_id)?);
    assert!(remove_organization_tag(&conn, organization_id, tag_id)?);

    // Confirm tags are no longer assigned
    assert!(get_contractor_tags(&conn, contractor_id)?.is_empty());
    assert!(get_organization_tags(&conn, organization_id)?.is_empty());

    Ok(())
}

#[test]
fn tags_filter_the_correct_records() -> Result<(), Box<dyn std::error::Error>> {
    use secure_crm_backend::tags::{get_contractors_by_tag, get_organizations_by_tag};

    let conn = rusqlite::Connection::open_in_memory()?;
    initialize_database(&conn)?;

    // Create two fictional organizations
    conn.execute(
        "INSERT INTO organizations (name, region)
         VALUES ('Fictional Alpha', 'North America')",
        [],
    )?;
    let org_a = conn.last_insert_rowid();

    conn.execute(
        "INSERT INTO organizations (name, region)
         VALUES ('Fictional Beta', 'North America')",
        [],
    )?;
    let org_b = conn.last_insert_rowid();

    // Create a fictional contractor for each organization
    conn.execute(
        "INSERT INTO contractors (full_name, organization_id)
         VALUES (?1, ?2)",
        rusqlite::params!["Fictional Rowan Finch", org_a],
    )?;
    let contractor_a = conn.last_insert_rowid();

    conn.execute(
        "INSERT INTO contractors (full_name, organization_id)
         VALUES (?1, ?2)",
        rusqlite::params!["Fictional Morgan Vale", org_b],
    )?;
    let contractor_b = conn.last_insert_rowid();

    let tag_id = add_tag(&conn, "Engineering")?;

    // Tag only the first organization and contractor
    assert!(assign_organization_tag(&conn, org_a, tag_id)?);
    assert!(assign_contractor_tag(&conn, contractor_a, tag_id)?);

    let organizations = get_organizations_by_tag(&conn, tag_id)?;
    let contractors = get_contractors_by_tag(&conn, tag_id)?;

    assert_eq!(organizations.len(), 1);
    assert_eq!(organizations[0].id, org_a);

    assert_eq!(contractors.len(), 1);
    assert_eq!(contractors[0].id, contractor_a);

    assert_ne!(organizations[0].id, org_b);
    assert_ne!(contractors[0].id, contractor_b);

    Ok(())
}

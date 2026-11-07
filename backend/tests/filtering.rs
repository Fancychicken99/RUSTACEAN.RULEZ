use rusqlite::Connection;

use secure_crm_backend::database::{add_contractor, add_organization};

use secure_crm_backend::filtering::get_contractors_by_region;
use secure_crm_backend::setup::initialize_database;

#[test]
fn test_filter_by_region() -> rusqlite::Result<()> {
    let conn = Connection::open_in_memory()?;

    initialize_database(&conn)?;

    // Create two fictional organizations
    let org1 = add_organization(&conn, "Example Defense LLC", "East Nairobi")?;

    let org2 = add_organization(&conn, "Global Engineering Group", "North America")?;

    // Create contractors in different regions
    add_contractor(&conn, "Jordan Lee", org1)?;
    add_contractor(&conn, "Alex Morgan", org2)?;

    // Search only East Nairobi
    let results = get_contractors_by_region(&conn, "East Nairobi")?;

    // Only Jordan Lee should appear
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].full_name, "Jordan Lee");

    Ok(())
}

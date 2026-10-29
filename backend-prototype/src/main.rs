use rusqlite::Connection;

use secure_crm_backend::database::get_contractors;
use secure_crm_backend::history::get_organization_history;
use secure_crm_backend::setup::initialize_database;

fn main() -> rusqlite::Result<()> {
    // Open our permanent database
    let conn = Connection::open("crm_demo.db")?;

    // Make sure database tables exist
    initialize_database(&conn)?;
    // Retrieve all active contractors
    let contractors = get_contractors(&conn)?;

    println!("Total saved contractors: {}", contractors.len());

    // Display each contractor
    for contractor in contractors {
        println!("-------------------------");
        println!("Contractor ID: {}", contractor.id);
        println!("Name: {}", contractor.full_name);

        println!(
            "Organization: {}",
            contractor
                .organization_name
                .as_deref()
                .unwrap_or("Not provided")
        );

        println!(
            "Region: {}",
            contractor.region.as_deref().unwrap_or("Not provided")
        );

        println!("Status: {}", contractor.status);

        println!(
            "Role: {}",
            contractor.role.as_deref().unwrap_or("Not provided")
        );

        println!(
            "Email: {}",
            contractor.email.as_deref().unwrap_or("Not provided")
        );

        println!(
            "Phone: {}",
            contractor.phone.as_deref().unwrap_or("Not provided")
        );

        // Retrieve this contractor's organization history
        let history = get_organization_history(&conn, contractor.id)?;

        println!("Organization transfers recorded: {}", history.len());
    }

    Ok(())
}

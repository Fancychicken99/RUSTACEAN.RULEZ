use rusqlite::{Connection, Result};

use crate::database::{add_organization_archive_field, create_tables};

use crate::admin::create_admin_table;
use crate::contacts::create_contact_table;
use crate::history::create_history_table;
use crate::images::create_organization_logo_table;
use crate::skills::create_skill_tables;
pub fn initialize_database(conn: &Connection) -> Result<()> {
    // Create contractor and organization tables
    create_tables(conn)?;

    // Apply existing database migrations
    add_organization_archive_field(conn)?;

    // Create contractor movement history
    create_history_table(conn)?;

    // Create skill management tables
    create_skill_tables(conn)?;

    // Create communication tracking table
    create_contact_table(conn)?;
    create_organization_logo_table(conn)?;
    create_admin_table(conn)?;

    Ok(())
}

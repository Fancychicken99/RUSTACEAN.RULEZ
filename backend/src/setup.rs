use rusqlite::{Connection, Result};

use crate::database::{add_organization_profile_fields, create_tables, migrate_sprint2};

use crate::admin::create_admin_table;
use crate::contacts::create_contact_table;
use crate::history::create_history_table;
use crate::images::create_organization_logo_table;
use crate::skills::create_skill_tables;
pub fn initialize_database(conn: &Connection) -> Result<()> {
    // Create contractor and organization tables
    create_tables(conn)?;

    // Apply existing database migrations
    add_organization_profile_fields(conn)?;

    // Create contractor movement history
    create_history_table(conn)?;

    // Create skill management tables
    create_skill_tables(conn)?;

    // Sprint 2: preserve existing rows and add new structured fields.
    migrate_sprint2(conn)?;
    crate::details::migrate_details(conn)?;
    crate::workspace::migrate(conn)?;

    // Create communication tracking table
    create_contact_table(conn)?;
    create_organization_logo_table(conn)?;
    create_admin_table(conn)?;

    Ok(())
}

use rusqlite::Connection;

use crate::database::{Contractor, get_contractors};
use crate::session::SessionManager;

pub fn list_contractors_if_authenticated(
    conn: &Connection,
    session: &SessionManager,
) -> Result<Vec<Contractor>, String> {
    // Check whether the administrator is logged in
    if !session.authorize_action() {
        return Err("Login required".to_string());
    }

    // Only retrieve records after authentication
    get_contractors(conn).map_err(|_| "Unable to load contractors".to_string())
}

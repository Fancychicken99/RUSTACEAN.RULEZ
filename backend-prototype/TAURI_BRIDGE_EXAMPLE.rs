
use rusqlite::Connection;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

use secure_crm_backend::database::Contractor;
use secure_crm_backend::protected::list_contractors_if_authenticated;
use secure_crm_backend::session::SessionManager;
use secure_crm_backend::setup::initialize_database;

// Shared database and login session
struct AppState {
    db: Mutex<Connection>,
    session: SessionManager,
}

// Administrator login
#[tauri::command]
fn login(
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Database unavailable".to_string())?;

    state
        .session
        .login(&conn, &password)
        .map_err(|_| "Login failed".to_string())
}

// Protected contractor retrieval
#[tauri::command]
fn list_contractors(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Contractor>, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Database unavailable".to_string())?;

    list_contractors_if_authenticated(
        &conn,
        &state.session,
    )
}

// Log out and lock access
#[tauri::command]
fn logout(state: tauri::State<'_, AppState>) {
    state.session.logout();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Use the operating system's app data folder
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            let conn = Connection::open(
                data_dir.join("crm.db")
            )?;

            initialize_database(&conn)?;

            app.manage(AppState {
                db: Mutex::new(conn),
                session: SessionManager::new(
                    Duration::from_secs(15 * 60)
                ),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            list_contractors,
            logout
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run CRM");
}

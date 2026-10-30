#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::AppState;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let mut data_dir = app.path().app_data_dir()?;
            // Debug-only isolation for executable tests; release uses app data.
            #[cfg(debug_assertions)]
            if let Some(test_dir) = std::env::var_os("RUSTACEAN_TEST_DATA_DIR") {
                let test_dir = std::path::PathBuf::from(test_dir);
                if !test_dir.is_absolute() {
                    return Err("Test data directory must be absolute".into());
                }
                data_dir = test_dir;
            }
            std::fs::create_dir_all(&data_dir)?;
            app.manage(AppState::open(&data_dir.join("crm.db"))?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_auth_status,
            commands::setup_admin,
            commands::login,
            commands::logout,
            commands::list_contractors,
            commands::list_organizations,
            commands::record_activity
        ])
        .run(tauri::generate_context!())
        .expect("Unable to start Rustacean CRM");
}

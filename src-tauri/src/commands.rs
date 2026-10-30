use rusqlite::Connection;
use secure_crm_backend::{
    admin::{admin_exists, create_first_admin},
    database::Contractor,
    protected::list_contractors_if_authenticated,
    session::SessionManager,
    setup::initialize_database,
};
use std::{
    path::Path,
    sync::{Mutex, MutexGuard},
    time::Duration,
};

// Serializes database and session operations, including login/logout races.
pub struct AppState {
    inner: Mutex<BackendState>,
}

struct BackendState {
    conn: Connection,
    session: SessionManager,
}

#[derive(serde::Serialize)]
pub struct AuthStatus {
    admin_exists: bool,
    authenticated: bool,
}

impl AppState {
    pub fn open(path: &Path) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        initialize_database(&conn)?;
        Ok(Self {
            inner: Mutex::new(BackendState {
                conn,
                session: SessionManager::new(Duration::from_secs(15 * 60)),
            }),
        })
    }

    fn lock(&self) -> Result<MutexGuard<'_, BackendState>, String> {
        self.inner.lock().map_err(|_| "Database unavailable".into())
    }

    fn auth_status(&self) -> Result<AuthStatus, String> {
        let state = self.lock()?;
        Ok(AuthStatus {
            admin_exists: admin_exists(&state.conn)
                .map_err(|_| "Unable to read authentication status")?,
            authenticated: state.session.is_authenticated(),
        })
    }

    fn configure_admin(&self, password: &str) -> Result<(), String> {
        let state = self.lock()?;
        if admin_exists(&state.conn).map_err(|_| "Unable to configure administrator")? {
            return Err("Administrator already configured".into());
        }
        if password.chars().count() < 12 {
            return Err("Password must contain at least 12 characters".into());
        }
        match create_first_admin(&state.conn, password) {
            Ok(true) => Ok(()),
            Ok(false) => Err("Administrator already configured".into()),
            Err(_) => Err("Unable to configure administrator".into()),
        }
    }

    fn sign_in(&self, password: &str) -> Result<bool, String> {
        let state = self.lock()?;
        state
            .session
            .login(&state.conn, password)
            .map_err(|_| "Login failed".into())
    }

    fn sign_out(&self) -> Result<(), String> {
        self.lock()?.session.logout();
        Ok(())
    }

    fn contractors(&self) -> Result<Vec<Contractor>, String> {
        let state = self.lock()?;
        list_contractors_if_authenticated(&state.conn, &state.session)
    }
}

#[tauri::command]
pub fn get_auth_status(state: tauri::State<'_, AppState>) -> Result<AuthStatus, String> {
    state.auth_status()
}

#[tauri::command]
pub fn setup_admin(password: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.configure_admin(&password)
}

#[tauri::command]
pub fn login(password: String, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    state.sign_in(&password)
}

#[tauri::command]
pub fn logout(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.sign_out()
}

#[tauri::command]
pub fn list_contractors(state: tauri::State<'_, AppState>) -> Result<Vec<Contractor>, String> {
    state.contractors()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fresh_database_requires_setup_and_login_and_relocks_on_reopen() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("test.db");
        let app = AppState::open(&path).unwrap();
        assert!(!app.auth_status().unwrap().admin_exists);
        assert_eq!(app.contractors().unwrap_err(), "Login required");
        assert!(app.configure_admin("short").is_err());
        assert!(!app.auth_status().unwrap().admin_exists);
        app.configure_admin("fictional test password").unwrap();
        assert!(!app.auth_status().unwrap().authenticated);
        assert!(app.configure_admin("replacement password").is_err());
        assert!(!app.sign_in("incorrect").unwrap());
        assert!(app.sign_in("fictional test password").unwrap());
        assert!(app.contractors().unwrap().is_empty());
        {
            let state = app.lock().unwrap();
            let org = secure_crm_backend::database::add_organization(
                &state.conn,
                "Fictional Integration Workshop",
                "Test Region",
            )
            .unwrap();
            secure_crm_backend::database::add_contractor(&state.conn, "Fictional Rowan Finch", org)
                .unwrap();
        }
        assert_eq!(
            app.contractors().unwrap()[0].full_name,
            "Fictional Rowan Finch"
        );
        app.sign_out().unwrap();
        assert_eq!(app.contractors().unwrap_err(), "Login required");
        assert!(app.sign_in("fictional test password").unwrap());
        drop(app);
        let reopened = AppState::open(&path).unwrap();
        assert!(reopened.auth_status().unwrap().admin_exists);
        assert!(!reopened.auth_status().unwrap().authenticated);
        assert_eq!(reopened.contractors().unwrap_err(), "Login required");
        assert!(reopened.sign_in("fictional test password").unwrap());
        assert_eq!(
            reopened.contractors().unwrap()[0].full_name,
            "Fictional Rowan Finch"
        );
        assert!(!reopened.sign_in("incorrect").unwrap());
        assert_eq!(reopened.contractors().unwrap_err(), "Login required");
    }
}

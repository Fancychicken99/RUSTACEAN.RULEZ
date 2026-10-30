use rusqlite::Connection;
use secure_crm_backend::{
    admin::{admin_exists, create_first_admin},
    database::{Contractor, Organization, get_organizations},
    profiles::{self, ProfileError, ProfileFields},
    protected::list_contractors_if_authenticated,
    search::search_contractors,
    seed::{self, ImportReport},
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

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateContractorRequest {
    organization_id: i64,
    profile: ProfileFields,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateContractorRequest {
    id: i64,
    profile: ProfileFields,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OrganizationRequest {
    name: String,
    region: Option<String>,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RecordRequest {
    id: i64,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ContractorFilter {
    region: Option<String>,
}

fn profile_error(error: ProfileError, fallback: &str) -> String {
    match error {
        ProfileError::Database(_) => fallback.into(),
        other => other.to_string(),
    }
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

    fn filter(&self, request: ContractorFilter) -> Result<Vec<Contractor>, String> {
        let state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        let region = request
            .region
            .as_deref()
            .map(str::trim)
            .filter(|r| !r.is_empty());
        if region.is_some_and(|r| r.chars().count() > 120 || r.chars().any(char::is_control)) {
            return Err("Region must be at most 120 characters with no control characters".into());
        }
        search_contractors(&state.conn, region, None)
            .map_err(|_| "Unable to filter contractors".into())
    }

    fn import_samples(&self) -> Result<ImportReport, String> {
        let mut state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        seed::import_sample_data(&mut state.conn).map_err(|error| error.to_string())
    }

    fn organizations(&self) -> Result<Vec<Organization>, String> {
        let state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        get_organizations(&state.conn).map_err(|_| "Unable to load organizations".into())
    }

    fn activity(&self) -> Result<(), String> {
        if !self.lock()?.session.authorize_action() {
            return Err("Login required".into());
        }
        Ok(())
    }

    fn create(&self, request: CreateContractorRequest) -> Result<Contractor, String> {
        let mut state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        profiles::create_profile(&mut state.conn, request.organization_id, request.profile)
            .map_err(|e| profile_error(e, "Unable to save contractor"))
    }

    fn update(&self, request: UpdateContractorRequest) -> Result<Contractor, String> {
        let mut state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        profiles::update_profile(&mut state.conn, request.id, request.profile)
            .map_err(|e| profile_error(e, "Unable to save contractor"))
    }

    fn archive(&self, request: RecordRequest) -> Result<(), String> {
        let state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        profiles::archive_profile(&state.conn, request.id)
            .map_err(|e| profile_error(e, "Unable to archive contractor"))
    }

    fn create_org(&self, request: OrganizationRequest) -> Result<Organization, String> {
        let mut state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        profiles::create_organization(&mut state.conn, request.name, request.region)
            .map_err(|e| profile_error(e, "Unable to save organization"))
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

#[tauri::command]
pub fn filter_contractors(
    request: ContractorFilter,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Contractor>, String> {
    state.filter(request)
}

#[tauri::command]
pub fn import_sample_data(state: tauri::State<'_, AppState>) -> Result<ImportReport, String> {
    state.import_samples()
}

#[tauri::command]
pub fn list_organizations(state: tauri::State<'_, AppState>) -> Result<Vec<Organization>, String> {
    state.organizations()
}

#[tauri::command]
pub fn record_activity(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.activity()
}

#[tauri::command]
pub fn create_contractor(
    request: CreateContractorRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Contractor, String> {
    state.create(request)
}
#[tauri::command]
pub fn update_contractor(
    request: UpdateContractorRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Contractor, String> {
    state.update(request)
}
#[tauri::command]
pub fn archive_contractor(
    request: RecordRequest,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    state.archive(request)
}
#[tauri::command]
pub fn create_organization(
    request: OrganizationRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Organization, String> {
    state.create_org(request)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sample_import_and_region_filter_are_protected_repeatable_and_exclude_archives() {
        let directory = tempfile::tempdir().unwrap();
        let app = AppState::open(&directory.path().join("samples.db")).unwrap();
        assert_eq!(app.import_samples().unwrap_err(), "Login required");
        assert_eq!(
            app.filter(ContractorFilter { region: None }).unwrap_err(),
            "Login required"
        );
        app.configure_admin("fictional test password").unwrap();
        app.sign_in("fictional test password").unwrap();
        assert_eq!(app.import_samples().unwrap().contractors_added, 60);
        let records = app
            .filter(ContractorFilter {
                region: Some("  east nairobi  ".into()),
            })
            .unwrap();
        assert_eq!(records.len(), 10);
        assert!(
            records
                .iter()
                .all(|r| r.region.as_deref() == Some("East Nairobi"))
        );
        assert!(
            app.filter(ContractorFilter {
                region: Some("Unmatched Region".into())
            })
            .unwrap()
            .is_empty()
        );
        assert!(
            app.filter(ContractorFilter {
                region: Some("Bad\nRegion".into())
            })
            .is_err()
        );
        assert_eq!(
            app.filter(ContractorFilter {
                region: Some("  ".into())
            })
            .unwrap()
            .len(),
            60
        );
        app.archive(RecordRequest { id: records[0].id }).unwrap();
        let report = app.import_samples().unwrap();
        assert_eq!(report.contractors_added, 0);
        assert_eq!(report.contractors_skipped, 60);
        assert_eq!(
            app.filter(ContractorFilter {
                region: Some("East Nairobi".into())
            })
            .unwrap()
            .len(),
            9
        );
        assert_eq!(
            app.filter(ContractorFilter { region: None }).unwrap().len(),
            59
        );
    }

    fn profile() -> ProfileFields {
        ProfileFields {
            full_name: "Fictional Bridge Test".into(),
            role: None,
            email: Some("bridge@example.com".into()),
            phone: None,
        }
    }

    #[test]
    fn profile_mutations_require_login_and_return_persisted_records() {
        let directory = tempfile::tempdir().unwrap();
        let app = AppState::open(&directory.path().join("mutations.db")).unwrap();
        assert_eq!(
            app.create_org(OrganizationRequest {
                name: "Fictional Org".into(),
                region: None
            })
            .unwrap_err(),
            "Login required"
        );
        assert_eq!(
            app.create(CreateContractorRequest {
                organization_id: 1,
                profile: profile()
            })
            .unwrap_err(),
            "Login required"
        );
        assert_eq!(
            app.update(UpdateContractorRequest {
                id: 1,
                profile: profile()
            })
            .unwrap_err(),
            "Login required"
        );
        assert_eq!(
            app.archive(RecordRequest { id: 1 }).unwrap_err(),
            "Login required"
        );
        app.configure_admin("fictional test password").unwrap();
        app.sign_in("fictional test password").unwrap();
        let org = app
            .create_org(OrganizationRequest {
                name: "Fictional Org".into(),
                region: Some("Test Region".into()),
            })
            .unwrap();
        let saved = app
            .create(CreateContractorRequest {
                organization_id: org.id,
                profile: profile(),
            })
            .unwrap();
        assert_eq!(saved.organization_id, Some(org.id));
        let mut edited = profile();
        edited.full_name = "Fictional Edited".into();
        assert_eq!(
            app.update(UpdateContractorRequest {
                id: saved.id,
                profile: edited
            })
            .unwrap()
            .full_name,
            "Fictional Edited"
        );
        app.archive(RecordRequest { id: saved.id }).unwrap();
        assert!(app.contractors().unwrap().is_empty());
        assert!(
            app.update(UpdateContractorRequest {
                id: saved.id,
                profile: profile()
            })
            .is_err()
        );
        app.sign_out().unwrap();
        assert_eq!(
            app.archive(RecordRequest { id: saved.id }).unwrap_err(),
            "Login required"
        );
    }

    #[test]
    fn fresh_database_requires_setup_and_login_and_relocks_on_reopen() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("test.db");
        let app = AppState::open(&path).unwrap();
        assert!(!app.auth_status().unwrap().admin_exists);
        assert_eq!(app.contractors().unwrap_err(), "Login required");
        assert_eq!(app.organizations().unwrap_err(), "Login required");
        assert_eq!(app.activity().unwrap_err(), "Login required");
        assert!(app.configure_admin("short").is_err());
        assert!(!app.auth_status().unwrap().admin_exists);
        app.configure_admin("fictional test password").unwrap();
        assert!(!app.auth_status().unwrap().authenticated);
        assert!(app.configure_admin("replacement password").is_err());
        assert!(!app.sign_in("incorrect").unwrap());
        assert!(app.sign_in("fictional test password").unwrap());
        assert!(app.contractors().unwrap().is_empty());
        assert!(app.organizations().unwrap().is_empty());
        app.activity().unwrap();
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
        assert_eq!(
            app.organizations().unwrap()[0].name,
            "Fictional Integration Workshop"
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

    #[test]
    fn expired_session_cannot_be_revived_by_activity() {
        let directory = tempfile::tempdir().unwrap();
        let app = AppState::open(&directory.path().join("expiry.db")).unwrap();
        app.configure_admin("fictional test password").unwrap();
        app.lock().unwrap().session = SessionManager::new(Duration::ZERO);
        assert!(app.sign_in("fictional test password").unwrap());
        assert!(!app.auth_status().unwrap().authenticated);
        assert_eq!(app.activity().unwrap_err(), "Login required");
        assert_eq!(app.organizations().unwrap_err(), "Login required");
        assert_eq!(app.contractors().unwrap_err(), "Login required");
    }
}

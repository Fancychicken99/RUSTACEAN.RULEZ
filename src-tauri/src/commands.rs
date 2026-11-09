use rusqlite::Connection;
use secure_crm_backend::{
    contacts,
    database::{
<<<<<<< HEAD
        ArchivedRecord, Contractor, Organization,
        archive_organization as archive_organization_record, get_archived_records,
=======
        Contractor, Organization, archive_organization as archive_organization_record,
>>>>>>> a34fadfc93ffacce33d97241bf239fa0dc9c0b32
        get_organizations,
    },
    profiles::{self, ProfileError, ProfileFields},
    protected::list_contractors_if_authenticated,
    search::search_contractors,
    seed::{self, ImportReport},
    session::SessionManager,
    vault::VaultStore,
};
use std::{
    path::Path,
    sync::{Mutex, MutexGuard},
    time::{Duration, Instant},
};
use zeroize::Zeroizing;

// Serializes database and session operations, including login/logout races.
pub struct AppState {
    inner: Mutex<BackendState>,
    voice: std::sync::Arc<crate::voice::VoiceManager>,
}

struct BackendState {
    conn: Connection,
    session: SessionManager,
    vault: VaultStore,
    database_open: bool,
    pending_recovery: Option<Zeroizing<String>>,
    failed_attempts: u32,
    retry_after: Option<Instant>,
}

#[derive(serde::Serialize)]
pub struct AuthStatus {
    admin_exists: bool,
    authenticated: bool,
    database_encrypted: bool,
    legacy_copy_present: bool,
}

#[derive(serde::Serialize)]
pub struct RecoveryKeyResult {
    recovery_key: String,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RecoveryRequest {
    recovery_key: String,
    new_password: String,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PasswordChangeRequest {
    current_password: String,
    new_password: String,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OrganizationRegionRequest {
    id: i64,
    region: Option<String>,
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
    phone: Option<String>,
    email: Option<String>,
    notes: Option<String>,
<<<<<<< HEAD
    #[serde(default)]
    contact: profiles::OrganizationContactFields,
    #[serde(default)]
    extra_information: serde_json::Value,
=======
    contractor: Option<ProfileFields>,
    details: Option<secure_crm_backend::details::OrganizationDetails>,
>>>>>>> a34fadfc93ffacce33d97241bf239fa0dc9c0b32
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateOrganizationRequest {
    id: i64,
    name: String,
    region: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    notes: Option<String>,
<<<<<<< HEAD
    #[serde(default)]
    contact: profiles::OrganizationContactFields,
    #[serde(default)]
    extra_information: serde_json::Value,
=======
    details: Option<secure_crm_backend::details::OrganizationDetails>,
>>>>>>> a34fadfc93ffacce33d97241bf239fa0dc9c0b32
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RecordRequest {
    id: i64,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ContractorStatusRequest {
    id: i64,
    status: String,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OrganizationStatusRequest {
    id: i64,
    status: String,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ContactNoteRequest {
    id: i64,
    method: String,
    note: String,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ContractorFilter {
    region: Option<String>,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HistoryRequest {
    entity_type: String,
    id: i64,
}

fn profile_error(error: ProfileError, fallback: &str) -> String {
    match error {
        ProfileError::Database(_) => fallback.into(),
        other => other.to_string(),
    }
}

impl BackendState {
    fn close_database(&mut self) -> Result<(), String> {
        if self.database_open {
            self.conn = Connection::open_in_memory().map_err(|_| "Unable to close database")?;
            self.database_open = false;
        }
        self.pending_recovery = None;
        Ok(())
    }
    fn check_attempt(&self) -> Result<(), String> {
        if self.retry_after.is_some_and(|until| Instant::now() < until) {
            return Err("Please wait before trying again".into());
        }
        Ok(())
    }
    fn failed_attempt(&mut self) {
        self.failed_attempts = self.failed_attempts.saturating_add(1);
        if self.failed_attempts >= 3 {
            self.retry_after =
                Some(Instant::now() + Duration::from_secs(1u64 << self.failed_attempts.min(5)));
        }
    }
}

impl AppState {
    pub fn open(path: &Path) -> Result<Self, String> {
        let vault = VaultStore::open(path)?;
        Ok(Self {
            voice: std::sync::Arc::new(crate::voice::VoiceManager::default()),
            inner: Mutex::new(BackendState {
                conn: Connection::open_in_memory().map_err(|_| "Database unavailable")?,
                session: SessionManager::new(Duration::from_secs(15 * 60)),
                vault,
                database_open: false,
                pending_recovery: None,
                failed_attempts: 0,
                retry_after: None,
            }),
        })
    }

    fn lock(&self) -> Result<MutexGuard<'_, BackendState>, String> {
        let mut state = self.inner.lock().map_err(|_| "Database unavailable")?;
        if state.database_open && !state.session.is_authenticated() {
            self.voice.cancel();
            state.close_database()?;
        }
        Ok(state)
    }

    fn auth_status(&self) -> Result<AuthStatus, String> {
        let state = self.lock()?;
        let status = state.vault.status()?;
        Ok(AuthStatus {
            admin_exists: status.configured,
            authenticated: state.session.is_authenticated(),
            database_encrypted: status.encrypted,
            legacy_copy_present: status.legacy_copy_present,
        })
    }

    fn configure_admin(&self, password: &str) -> Result<RecoveryKeyResult, String> {
        let state = self.lock()?;
        let key = state.vault.setup(password)?;
        Ok(RecoveryKeyResult {
            recovery_key: key.to_string(),
        })
    }

    fn sign_in(&self, password: &str) -> Result<bool, String> {
        self.voice.cancel();
        let mut state = self.lock()?;
        state.check_attempt()?;
        state.session.logout();
        state.close_database()?;
        match state.vault.unlock(password) {
            Ok(Some(unlocked)) => {
                if !state.session.begin_verified_session() {
                    return Err("Session unavailable".into());
                }
                state.conn = unlocked.conn;
                state.database_open = true;
                state.pending_recovery = unlocked.recovery_key;
                state.failed_attempts = 0;
                state.retry_after = None;
                Ok(true)
            }
            Ok(None) => {
                state.failed_attempt();
                Ok(false)
            }
            Err(error) => {
                state.failed_attempt();
                Err(error)
            }
        }
    }

    fn sign_out(&self) -> Result<(), String> {
        self.voice.cancel();
        let mut state = self.lock()?;
        state.session.logout();
        state.close_database()
    }

    fn recovery_key(&self) -> Result<Option<String>, String> {
        let mut state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        Ok(state.pending_recovery.take().map(|key| key.to_string()))
    }

    fn recover_access(&self, code: &str, password: &str) -> Result<RecoveryKeyResult, String> {
        self.voice.cancel();
        let mut state = self.lock()?;
        state.check_attempt()?;
        state.session.logout();
        state.close_database()?;
        match state.vault.recover(code, password) {
            Ok(key) => {
                state.failed_attempts = 0;
                state.retry_after = None;
                Ok(RecoveryKeyResult {
                    recovery_key: key.to_string(),
                })
            }
            Err(error) => {
                state.failed_attempt();
                Err(error)
            }
        }
    }

    fn change_access(&self, current: &str, password: &str) -> Result<RecoveryKeyResult, String> {
        let mut state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        state.check_attempt()?;
        match state.vault.change_password(current, password) {
            Ok(key) => {
                state.session.logout();
                state.close_database()?;
                state.failed_attempts = 0;
                state.retry_after = None;
                Ok(RecoveryKeyResult {
                    recovery_key: key.to_string(),
                })
            }
            Err(error) => {
                state.failed_attempt();
                Err(error)
            }
        }
    }

    fn cleanup_original(&self) -> Result<(), String> {
        let state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        state.vault.remove_legacy_copy(&state.conn)
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

    fn archived_records(&self) -> Result<Vec<ArchivedRecord>, String> {
        let state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        get_archived_records(&state.conn).map_err(|_| "Unable to load archived records".into())
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

    fn set_status(&self, request: ContractorStatusRequest) -> Result<Contractor, String> {
        let state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        profiles::set_contractor_status(&state.conn, request.id, &request.status)
            .map_err(|e| profile_error(e, "Unable to update contractor status"))
    }

    fn set_org_status(&self, request: OrganizationStatusRequest) -> Result<Organization, String> {
        let state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        profiles::set_organization_status(&state.conn, request.id, &request.status)
            .map_err(|e| profile_error(e, "Unable to update organization status"))
    }

    fn save_contact_note(&self, request: ContactNoteRequest) -> Result<(), String> {
        let state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        profiles::validate_id(request.id).map_err(|e| e.to_string())?;
        if !matches!(
            request.method.as_str(),
            "Email" | "Phone" | "SMS" | "Teams" | "Other"
        ) {
            return Err("Select a valid contact method".into());
        }
        let note = request.note.trim();
        if note.is_empty()
            || note.chars().count() > 5_000
            || note
                .chars()
                .any(|ch| ch.is_control() && ch != '\n' && ch != '\t')
        {
            return Err("Contact note is required and must be at most 5000 characters".into());
        }
        match contacts::record_contact(&state.conn, request.id, &request.method, note) {
            Ok(true) => Ok(()),
            Ok(false) => Err("Contractor not found or archived".into()),
            Err(_) => Err("Unable to save contact note".into()),
        }
    }

    fn create_org(&self, request: OrganizationRequest) -> Result<Organization, String> {
        let mut state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
<<<<<<< HEAD
        profiles::create_organization_profile_complete(
=======
        profiles::create_organization_complete(
>>>>>>> a34fadfc93ffacce33d97241bf239fa0dc9c0b32
            &mut state.conn,
            request.name,
            request.region,
            request.phone,
            request.email,
            request.notes,
<<<<<<< HEAD
            request.contact,
            request.extra_information,
=======
            request.contractor,
            request.details,
>>>>>>> a34fadfc93ffacce33d97241bf239fa0dc9c0b32
        )
        .map_err(|e| profile_error(e, "Unable to save organization"))
    }

    fn update_org(&self, request: UpdateOrganizationRequest) -> Result<Organization, String> {
        let mut state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
<<<<<<< HEAD
        profiles::update_organization_profile_complete(
            &state.conn,
=======
        profiles::update_organization_complete(
            &mut state.conn,
>>>>>>> a34fadfc93ffacce33d97241bf239fa0dc9c0b32
            request.id,
            request.name,
            request.region,
            request.phone,
            request.email,
            request.notes,
<<<<<<< HEAD
            request.contact,
            request.extra_information,
=======
            request.details,
>>>>>>> a34fadfc93ffacce33d97241bf239fa0dc9c0b32
        )
        .map_err(|e| profile_error(e, "Unable to save organization"))
    }

    fn archive_org(&self, request: RecordRequest) -> Result<(), String> {
        let state = self.lock()?;
        if !state.session.authorize_action() {
            return Err("Login required".into());
        }
        profiles::validate_id(request.id).map_err(|e| e.to_string())?;
        if !archive_organization_record(&state.conn, request.id)
            .map_err(|_| "Unable to archive organization")?
        {
            return Err("Organization not found or archived".into());
        }
        Ok(())
    }
}

#[tauri::command]
pub fn get_record_history(
    request: HistoryRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<secure_crm_backend::history::RecordChange>, String> {
    let state = state.lock()?;
    if !state.session.authorize_action() {
        return Err("Login required".into());
    }
    profiles::validate_id(request.id).map_err(|e| e.to_string())?;
    if !matches!(request.entity_type.as_str(), "contractor" | "organization") {
        return Err("Record type must be contractor or organization".into());
    }
    secure_crm_backend::history::get_record_history(&state.conn, &request.entity_type, request.id)
        .map_err(|_| "Unable to load record history".into())
}

#[tauri::command]
pub fn get_auth_status(state: tauri::State<'_, AppState>) -> Result<AuthStatus, String> {
    state.auth_status()
}

#[tauri::command]
pub fn setup_admin(
    password: String,
    state: tauri::State<'_, AppState>,
) -> Result<RecoveryKeyResult, String> {
    let password = Zeroizing::new(password);
    state.configure_admin(&password)
}

#[tauri::command]
pub fn login(password: String, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let password = Zeroizing::new(password);
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
pub fn list_archived_records(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ArchivedRecord>, String> {
    state.archived_records()
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
pub fn set_contractor_status(
    request: ContractorStatusRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Contractor, String> {
    state.set_status(request)
}
#[tauri::command]
pub fn set_organization_status(
    request: OrganizationStatusRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Organization, String> {
    state.set_org_status(request)
}
#[tauri::command]
pub fn record_contact_note(
    request: ContactNoteRequest,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    state.save_contact_note(request)
}
#[tauri::command]
pub fn create_organization(
    request: OrganizationRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Organization, String> {
    state.create_org(request)
}

#[tauri::command]
pub fn update_organization(
    request: UpdateOrganizationRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Organization, String> {
    state.update_org(request)
}

#[tauri::command]
pub fn archive_organization(
    request: RecordRequest,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    state.archive_org(request)
}

#[tauri::command]
pub fn take_recovery_key(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    state.recovery_key()
}

#[tauri::command]
pub fn set_organization_region(
    request: OrganizationRegionRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Organization, String> {
    let backend = state.lock()?;
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    profiles::set_organization_region(&backend.conn, request.id, request.region)
        .map_err(|error| profile_error(error, "Unable to save region"))
}

#[tauri::command]
pub fn recover_password(
    request: RecoveryRequest,
    state: tauri::State<'_, AppState>,
) -> Result<RecoveryKeyResult, String> {
    let key = Zeroizing::new(request.recovery_key);
    let password = Zeroizing::new(request.new_password);
    state.recover_access(&key, &password)
}

#[tauri::command]
pub fn change_password(
    request: PasswordChangeRequest,
    state: tauri::State<'_, AppState>,
) -> Result<RecoveryKeyResult, String> {
    let current = Zeroizing::new(request.current_password);
    let password = Zeroizing::new(request.new_password);
    state.change_access(&current, &password)
}

#[tauri::command]
pub fn remove_original_database(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.cleanup_original()
}

#[derive(serde::Deserialize)]
#[serde(tag = "action", rename_all = "snake_case", deny_unknown_fields)]
pub enum WorkspaceAction {
    Taxonomy {
        kind: secure_crm_backend::workspace::Kind,
        id: i64,
        tags: Vec<String>,
        skills: Vec<String>,
    },
    Restore {
        kind: secure_crm_backend::workspace::Kind,
        id: i64,
    },
    Transfer {
        id: i64,
        organization_id: i64,
    },
    OrganizationStatus {
        id: i64,
        status: String,
    },
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MediaRequest {
    kind: secure_crm_backend::workspace::Kind,
    id: i64,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TransferPasswordRequest {
    password: String,
    new_password: Option<String>,
}
#[derive(serde::Serialize)]
pub struct ImportedWorkspace {
    recovery_key: String,
    backup_name: Option<String>,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NativeContactRequest {
    id: i64,
    method: String,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AudioRequest {
    audio: Vec<u8>,
}
#[tauri::command]
pub async fn transcribe_audio(
    request: AudioRequest,
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    {
        let backend = state.lock()?;
        if !backend.session.authorize_action() {
            return Err("Login required".into());
        }
    }
    #[cfg(not(debug_assertions))]
    use tauri::Manager;
    #[cfg(debug_assertions)]
    let resources = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/voice");
    #[cfg(not(debug_assertions))]
    let resources = app
        .path()
        .resource_dir()
        .map_err(|_| "Unable to locate offline dictation resources")?
        .join("resources/voice");
    #[cfg(debug_assertions)]
    let _ = &app;
    let manager = state.voice.clone();
    let ticket = manager.ticket()?;
    let result = tauri::async_runtime::spawn_blocking(move || {
        manager.transcribe(&resources, request.audio, ticket)
    })
    .await
    .map_err(|_| "Dictation task failed")??;
    let backend = state.lock()?;
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    Ok(result)
}
#[tauri::command]
pub fn cancel_dictation(state: tauri::State<'_, AppState>) {
    state.voice.cancel();
}

impl Drop for AppState {
    fn drop(&mut self) {
        self.voice.cancel();
    }
}

#[tauri::command]
pub fn export_workspace(
    request: TransferPasswordRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Option<secure_crm_backend::vault::TransferPreview>, String> {
    let password = Zeroizing::new(request.password);
    let backend = state.lock()?;
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    let Some(path) = secure_crm_backend::transfer_dialog::save_path() else {
        return Ok(None);
    };
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    backend
        .vault
        .export_to(&backend.conn, &path, &password)
        .map(Some)
}
#[tauri::command]
pub fn import_workspace(
    request: TransferPasswordRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Option<ImportedWorkspace>, String> {
    let password = Zeroizing::new(request.password);
    let new_password = Zeroizing::new(
        request
            .new_password
            .ok_or("New login password is required")?,
    );
    let mut backend = state.lock()?;
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    let Some(path) = secure_crm_backend::transfer_dialog::open_path() else {
        return Ok(None);
    };
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    let result = backend
        .vault
        .import_from(&path, &password, &new_password, |info| {
            secure_crm_backend::transfer_dialog::confirm(info) && backend.session.authorize_action()
        })?;
    if let Some(result) = result {
        backend.session.logout();
        backend.close_database()?;
        Ok(Some(ImportedWorkspace {
            recovery_key: result.recovery_key.to_string(),
            backup_name: result.backup_name,
        }))
    } else {
        Ok(None)
    }
}
#[tauri::command]
pub fn open_contact_action(
    request: NativeContactRequest,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let backend = state.lock()?;
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    secure_crm_backend::transfer_dialog::contact(&backend.conn, request.id, &request.method)
}
#[tauri::command]
pub fn load_record_image(
    request: MediaRequest,
    state: tauri::State<'_, AppState>,
) -> Result<Option<String>, String> {
    let backend = state.lock()?;
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    secure_crm_backend::media::load(&backend.conn, request.kind, request.id)
        .map_err(|error| profile_error(error, "Unable to load image"))
}

#[tauri::command]
pub fn workspace_snapshot(
    state: tauri::State<'_, AppState>,
) -> Result<secure_crm_backend::workspace::Snapshot, String> {
    let backend = state.lock()?;
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    secure_crm_backend::workspace::snapshot(&backend.conn)
        .map_err(|error| profile_error(error, "Unable to load classifications and history"))
}
#[tauri::command]
pub fn workspace_action(
    request: WorkspaceAction,
    state: tauri::State<'_, AppState>,
) -> Result<secure_crm_backend::workspace::Snapshot, String> {
    let mut backend = state.lock()?;
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    use secure_crm_backend::workspace;
    let outcome = match request {
        WorkspaceAction::Taxonomy {
            kind,
            id,
            tags,
            skills,
        } => workspace::save_taxonomy(&mut backend.conn, kind, id, tags, skills),
        WorkspaceAction::Restore { kind, id } => workspace::restore(&backend.conn, kind, id),
        WorkspaceAction::Transfer {
            id,
            organization_id,
        } => {
            profiles::validate_id(id).map_err(|e| e.to_string())?;
            profiles::validate_id(organization_id).map_err(|e| e.to_string())?;
            secure_crm_backend::history::transfer_contractor(&mut backend.conn, id, organization_id)
                .map(|_| ())
                .map_err(ProfileError::from)
        }
        WorkspaceAction::OrganizationStatus { id, status } => {
            profiles::set_organization_status(&backend.conn, id, &status).map(|_| ())
        }
    };
    outcome.map_err(|error| profile_error(error, "Unable to update record"))?;
    workspace::snapshot(&backend.conn)
        .map_err(|error| profile_error(error, "Saved, but history could not reload"))
}
#[tauri::command]
pub fn search_records(
    request: secure_crm_backend::workspace::Search,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Contractor>, String> {
    let backend = state.lock()?;
    if !backend.session.authorize_action() {
        return Err("Login required".into());
    }
    secure_crm_backend::workspace::search(&backend.conn, request)
        .map_err(|error| profile_error(error, "Unable to search records"))
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
            56
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
            55
        );
    }

    fn profile() -> ProfileFields {
        ProfileFields {
            details: None,
            full_name: "Fictional Bridge Test".into(),
            prefix: None,
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
            role: None,
            email: Some("bridge@example.com".into()),
            phone: None,
            extra_information: serde_json::json!({}),
        }
    }

    #[test]
    fn profile_mutations_require_login_and_return_persisted_records() {
        let directory = tempfile::tempdir().unwrap();
        let app = AppState::open(&directory.path().join("mutations.db")).unwrap();
        assert_eq!(
            app.create_org(OrganizationRequest {
                name: "Fictional Org".into(),
                region: None,
                phone: None,
                email: None,
                notes: None,
<<<<<<< HEAD
                contact: profiles::OrganizationContactFields::default(),
                extra_information: serde_json::json!({}),
=======
                contractor: Some(profile()),
                details: None,
>>>>>>> a34fadfc93ffacce33d97241bf239fa0dc9c0b32
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
                phone: None,
                email: None,
                notes: None,
<<<<<<< HEAD
                contact: profiles::OrganizationContactFields::default(),
                extra_information: serde_json::json!({}),
=======
                contractor: None,
                details: None,
>>>>>>> a34fadfc93ffacce33d97241bf239fa0dc9c0b32
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

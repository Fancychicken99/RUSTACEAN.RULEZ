/** Frontend IPC boundary. See docs/ipc-contract.md for implementation status.
 * Methods return promises; callers own rendering, loading states, and errors.
 * Requires Tauri's global API. No browser fixture fallback.
 */
window.crmApi = Object.freeze({
  getAuthStatus: () => invokeCrm('get_auth_status'),
  setupAdmin: (password) => invokeCrm('setup_admin', { password }),
  login: (password) => invokeCrm('login', { password }),
  logout: () => invokeCrm('logout'),
  takeRecoveryKey: () => invokeCrm('take_recovery_key'),
  recoverPassword: (request) => invokeCrm('recover_password', { request }),
  changePassword: (request) => invokeCrm('change_password', { request }),
  removeOriginalDatabase: () => invokeCrm('remove_original_database'),
  setOrganizationRegion: (request) => invokeCrm('set_organization_region', { request }),
  workspaceSnapshot: () => invokeCrm('workspace_snapshot'),
  workspaceAction: (request) => invokeCrm('workspace_action', { request }),
  searchRecords: (request) => invokeCrm('search_records', { request }),
  loadRecordImage: (request) => invokeCrm('load_record_image', { request }),
  exportWorkspace: (request) => invokeCrm('export_workspace', { request }),
  importWorkspace: (request) => invokeCrm('import_workspace', { request }),
  openContactAction: (request) => invokeCrm('open_contact_action', { request }),
  transcribeAudio: (audio) => invokeCrm('transcribe_audio', { request: { audio } }),
  cancelDictation: () => invokeCrm('cancel_dictation'),
  listContractors: () => invokeCrm('list_contractors'),
  listOrganizations: () => invokeCrm('list_organizations'),
  recordActivity: () => invokeCrm('record_activity'),
  createContractor: (request) => invokeCrm('create_contractor', { request }),
  updateContractor: (request) => invokeCrm('update_contractor', { request }),
  archiveContractor: (request) => invokeCrm('archive_contractor', { request }),
  setContractorStatus: (request) => invokeCrm('set_contractor_status', { request }),
  recordContactNote: (request) => invokeCrm('record_contact_note', { request }),
  // Optional request.contractor is saved atomically with its new organization.
  createOrganization: (request) => invokeCrm('create_organization', { request }),
  updateOrganization: (request) => invokeCrm('update_organization', { request }),
  archiveOrganization: (request) => invokeCrm('archive_organization', { request }),
  filterContractors: (request) => invokeCrm('filter_contractors', { request }),
  importSampleData: () => invokeCrm('import_sample_data'),
});

async function invokeCrm(command, args = {}) {
  const core = window.__TAURI__?.core;
  if (typeof core?.invoke !== 'function') {
    throw new Error('Desktop backend unavailable. Open the CRM executable.');
  }

  try {
    return await core.invoke(command, args);
  } catch (error) {
    // Tauri can reject with a string; give UI callers a consistent Error.
    if (error instanceof Error) throw error;
    throw new Error(typeof error === 'string' ? error : 'Backend request failed.');
  }
}

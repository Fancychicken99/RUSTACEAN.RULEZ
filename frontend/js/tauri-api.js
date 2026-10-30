/** Frontend IPC boundary. See docs/ipc-contract.md for implementation status.
 * Methods return promises; callers own rendering, loading states, and errors.
 * Requires Tauri's global API. No browser fixture fallback.
 */
window.crmApi = Object.freeze({
  getAuthStatus: () => invokeCrm('get_auth_status'),
  setupAdmin: (password) => invokeCrm('setup_admin', { password }),
  login: (password) => invokeCrm('login', { password }),
  logout: () => invokeCrm('logout'),
  listContractors: () => invokeCrm('list_contractors'),
  listOrganizations: () => invokeCrm('list_organizations'),
  recordActivity: () => invokeCrm('record_activity'),
  createContractor: (request) => invokeCrm('create_contractor', { request }),
  updateContractor: (request) => invokeCrm('update_contractor', { request }),
  archiveContractor: (request) => invokeCrm('archive_contractor', { request }),
  createOrganization: (request) => invokeCrm('create_organization', { request }),
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

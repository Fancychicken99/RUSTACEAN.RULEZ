(() => {
  const byId = id => document.getElementById(id);
  let busy = false, generation = 0;
  async function transfer(importing) {
    if (busy || !window.crmSession?.authenticated) return;
    const status = byId('transfer-message');
    const password = byId('transfer-password').value;
    if (password !== byId('transfer-confirm').value) { status.textContent = 'Transfer passwords do not match.'; return; }
    const newPassword = byId('transfer-new-password').value;
    if (importing && (!newPassword || newPassword !== byId('transfer-new-confirm').value)) { status.textContent = 'Enter and confirm a new login password for the imported workspace.'; return; }
    if (!byId('transfer-form').reportValidity()) return;
    const request = { password, new_password: importing ? newPassword : null };
    busy = true; const token = generation;
    byId('export-workspace').disabled = true; byId('import-workspace').disabled = true;
    byId('transfer-form').reset(); status.textContent = importing ? 'Choose a transfer file and review the import.' : 'Choose where to save the encrypted transfer file.';
    try {
      const result = importing ? await window.crmApi.importWorkspace(request) : await window.crmApi.exportWorkspace(request);
      if (token !== generation) return;
      if (!result) { status.textContent = 'Cancelled. Workspace unchanged.'; return; }
      if (importing) await window.crmSession.credentialChange(result);
      else { status.textContent = 'Encrypted export saved.'; window.crmNotify('Encrypted workspace export saved.'); }
    } catch (error) { if (token === generation) status.textContent = error.message; }
    finally { request.password = ''; request.new_password = ''; busy = false; byId('export-workspace').disabled = false; byId('import-workspace').disabled = false; }
  }
  byId('export-workspace').addEventListener('click', () => transfer(false));
  byId('import-workspace').addEventListener('click', () => transfer(true));
  byId('transfer-form').addEventListener('submit', event => event.preventDefault());
  window.addEventListener('crm:locked', () => { ++generation; byId('transfer-form').reset(); byId('transfer-message').textContent = ''; });
})();

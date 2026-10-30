(() => {
  const modal = document.getElementById('sample-import-modal');
  const message = document.getElementById('sample-import-message');
  let busy = false;
  let generation = 0;
  function setBusy(value) {
    busy = value;
    modal.querySelectorAll('button').forEach(button => { button.disabled = value; });
  }
  modal.addEventListener('show.bs.modal', event => {
    if (!window.crmSession?.authenticated || busy) { event.preventDefault(); return; }
    ++generation;
    modal.inert = false;
    message.textContent = '';
  });
  modal.addEventListener('shown.bs.modal', () => {
    if (!window.crmSession?.authenticated) bootstrap.Modal.getInstance(modal)?.hide();
  });
  modal.addEventListener('hide.bs.modal', event => { if (busy) event.preventDefault(); });
  modal.addEventListener('hidden.bs.modal', () => { message.textContent = ''; });
  document.getElementById('sample-import-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !window.crmSession?.authenticated) return;
    const token = generation;
    const current = () => token === generation && window.crmSession?.authenticated;
    setBusy(true);
    message.textContent = 'Importing fictional records…';
    try {
      const report = await window.crmApi.importSampleData();
      if (!current()) return;
      setBusy(false);
      document.activeElement?.blur();
      bootstrap.Modal.getOrCreateInstance(modal).hide();
      const refreshed = await window.crmDirectory.refresh();
      if (!current()) return;
      const result = `Sample import complete: ${report.contractors_added} contractors and ${report.organizations_added} organizations added; ${report.contractors_skipped} contractors and ${report.organizations_skipped} organizations skipped.`;
      document.getElementById('workspace-message').textContent = result + (refreshed ? '' : ' Could not refresh records. Use Refresh.');
    } catch (error) {
      if (!current()) return;
      message.textContent = error.message;
      if (error.message === 'Login required') await window.crmSession.lock('Session expired. Log in again.');
    } finally { if (token === generation) setBusy(false); }
  });
  window.addEventListener('crm:locked', () => {
    ++generation;
    setBusy(false);
    modal.inert = true;
    message.textContent = '';
    bootstrap.Modal.getInstance(modal)?.hide();
  });
})();

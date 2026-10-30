(() => {
  const byId = id => document.getElementById(id);
  let needsSetup = false;
  let busy = false;
  let authenticated = false;

  function message(text) { byId('message').textContent = text; }
  function clearRecords() {
    byId('records').replaceChildren();
    byId('contractors').hidden = true;
    byId('empty').hidden = true;
  }
  function setStatus(status) {
    authenticated = status.authenticated;
    needsSetup = !status.admin_exists;
    byId('auth').hidden = authenticated;
    byId('directory').hidden = !authenticated;
    byId('auth-heading').textContent = needsSetup ? 'Set up local administrator' : 'Log in';
    byId('submit-auth').textContent = needsSetup ? 'Create password' : 'Log in';
    byId('setup-help').hidden = !needsSetup;
    byId('password').autocomplete = needsSetup ? 'new-password' : 'current-password';
    if (!authenticated) clearRecords();
  }
  async function loadRecords() {
    const records = await window.crmApi.listContractors();
    clearRecords();
    for (const record of records) {
      const row = document.createElement('tr');
      for (const value of [record.full_name, record.organization_name, record.region, record.status]) {
        const cell = document.createElement('td');
        cell.textContent = value ?? 'Not provided';
        row.appendChild(cell);
      }
      byId('records').appendChild(row);
    }
    byId('empty').hidden = records.length !== 0;
    byId('contractors').hidden = records.length === 0;
    message(`Loaded ${records.length} saved contractor(s).`);
  }
  async function run(action) {
    if (busy) return;
    busy = true;
    document.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try {
      await action();
    } catch (error) {
      // Remove sensitive stale content on any failed request.
      clearRecords();
      try { setStatus(await window.crmApi.getAuthStatus()); }
      catch { setStatus({ admin_exists: true, authenticated: false }); }
      message(error.message);
    } finally {
      busy = false;
      document.querySelectorAll('button').forEach(button => { button.disabled = false; });
    }
  }
  byId('auth-form').addEventListener('submit', event => {
    event.preventDefault();
    const password = byId('password').value;
    byId('password').value = '';
    run(async () => {
      if (needsSetup) {
        await window.crmApi.setupAdmin(password);
        setStatus(await window.crmApi.getAuthStatus());
        message('Administrator configured. Log in with your new password.');
      } else {
        const correct = await window.crmApi.login(password);
        setStatus(await window.crmApi.getAuthStatus());
        if (correct) await loadRecords();
        else message('Incorrect password.');
      }
    });
  });
  byId('refresh').addEventListener('click', () => run(loadRecords));
  byId('lock').addEventListener('click', () => run(async () => {
    // Clear the UI immediately; backend logout must still complete successfully.
    setStatus({ admin_exists: true, authenticated: false });
    await window.crmApi.logout();
    message('Workspace locked.');
  }));
  setInterval(() => {
    if (busy || !authenticated) return;
    run(async () => {
      setStatus(await window.crmApi.getAuthStatus());
      if (!authenticated) message('Session expired. Log in again.');
    });
  }, 5000);
  run(async () => {
    setStatus(await window.crmApi.getAuthStatus());
    if (authenticated) await loadRecords();
    else message(needsSetup ? 'Configure the local administrator to begin.' : 'Log in to view saved contractors.');
  });
})();

(() => {
  const IDLE_MS = 15 * 60 * 1000;
  const ACTIVITY_THROTTLE_MS = 30 * 1000;
  const byId = id => document.getElementById(id);
  const workspace = byId('workspace');
  const auth = byId('auth');
  const form = byId('auth-form');
  let authenticated = false;
  let needsSetup = false;
  let busy = false;
  let checking = false;
  let activityPending = false;
  let version = 0;
  let idleTimer;
  let expiresAt = 0;
  let lastActivitySent = 0;

  function message(text) { byId('message').textContent = text; }
  function configureForm(status) {
    needsSetup = !status.admin_exists;
    byId('auth-heading').textContent = needsSetup ? 'Set up local administrator' : 'Log in';
    byId('submit-auth').textContent = needsSetup ? 'Create password' : 'Log in';
    byId('setup-help').hidden = !needsSetup;
    byId('password').autocomplete = needsSetup ? 'new-password' : 'current-password';
    byId('confirm-password-group').hidden = !needsSetup;
    byId('confirm-password').required = needsSetup;
    form.hidden = false;
    byId('retry-auth').hidden = true;
  }
  function showLocked() {
    document.activeElement?.blur();
    authenticated = false;
    clearTimeout(idleTimer);
    workspace.hidden = true;
    workspace.inert = true;
    auth.hidden = false;
    byId('password').value = '';
    byId('confirm-password').value = '';
    byId('confirm-password').classList.remove('is-invalid');
    document.querySelectorAll('.modal.show, .offcanvas.show').forEach(element => {
      (element.classList.contains('modal') ? bootstrap.Modal : bootstrap.Offcanvas).getInstance(element)?.hide();
    });
    document.querySelectorAll('.modal form').forEach(modalForm => modalForm.reset());
    window.dispatchEvent(new Event('crm:locked'));
  }
  async function lock() {
    ++version;
    showLocked();
    message('Enter your password to reopen the workspace.');
    try {
      await window.crmApi.logout();
    } catch (error) {
      message(`Workspace hidden. Could not confirm backend lock: ${error.message}`);
      byId('retry-auth').hidden = false;
    }
  }
  function resetIdleTimer() {
    expiresAt = Date.now() + IDLE_MS;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => lock('Workspace locked after inactivity.'), IDLE_MS);
  }
  function unlock() {
    ++version;
    authenticated = true;
    lastActivitySent = 0;
    resetIdleTimer();
    auth.hidden = true;
    workspace.hidden = false;
    workspace.inert = false;
    window.dispatchEvent(new Event('crm:unlocked'));
  }
  async function connect() {
    if (busy) return;
    busy = true;
    byId('retry-auth').disabled = true;
    const requestVersion = ++version;
    try {
      const status = await window.crmApi.getAuthStatus();
      // A reloaded page starts locked even if the process held an old session.
      if (status.authenticated) await window.crmApi.logout();
      if (requestVersion !== version) return;
      configureForm(status);
      message(needsSetup ? 'Create your local administrator password.' : 'Enter your password to open the workspace.');
    } catch (error) {
      if (requestVersion !== version) return;
      form.hidden = true;
      byId('auth-heading').textContent = 'Connection unavailable';
      message(error.message);
      byId('retry-auth').hidden = false;
    } finally {
      busy = false;
      byId('retry-auth').disabled = false;
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const password = byId('password').value;
    const confirmPassword = byId('confirm-password');
    confirmPassword.classList.remove('is-invalid');
    if (needsSetup && password !== confirmPassword.value) {
      confirmPassword.classList.add('is-invalid');
      confirmPassword.focus();
      return;
    }
    busy = true;
    byId('submit-auth').disabled = true;
    const requestVersion = version;
    byId('password').value = '';
    confirmPassword.value = '';
    try {
      if (needsSetup) {
        await window.crmApi.setupAdmin(password);
        const status = await window.crmApi.getAuthStatus();
        if (requestVersion !== version) return;
        configureForm(status);
        message('Administrator configured. Log in with your new password.');
      } else {
        const correct = await window.crmApi.login(password);
        if (requestVersion !== version) {
          if (correct) await window.crmApi.logout();
          return;
        }
        if (correct) unlock();
        else message('Incorrect password.');
      }
    } catch (error) {
      if (requestVersion === version) message(error.message);
    } finally {
      busy = false;
      byId('submit-auth').disabled = false;
    }
  });
  byId('retry-auth').addEventListener('click', connect);
  byId('lock').addEventListener('click', () => lock());

  async function recordActivity(event) {
    if (!authenticated || !event.isTrusted) return;
    if (Date.now() >= expiresAt) { await lock('Workspace locked after inactivity.'); return; }
    resetIdleTimer();
    if (activityPending || Date.now() - lastActivitySent < ACTIVITY_THROTTLE_MS) return;
    const requestVersion = version;
    activityPending = true;
    lastActivitySent = Date.now();
    try {
      await window.crmApi.recordActivity();
    } catch (error) {
      if (authenticated && requestVersion === version) await lock(error.message);
    } finally {
      activityPending = false;
    }
  }
  ['pointerdown', 'pointermove', 'keydown', 'input'].forEach(name => window.addEventListener(name, recordActivity, { passive: true }));

  async function checkSession() {
    if (!authenticated || checking || busy) return;
    if (Date.now() >= expiresAt) { await lock('Workspace locked after inactivity.'); return; }
    const requestVersion = version;
    checking = true;
    try {
      const status = await window.crmApi.getAuthStatus();
      if (authenticated && requestVersion === version && !status.authenticated) await lock('Session expired. Log in again.');
    } catch (error) {
      if (authenticated && requestVersion === version) await lock(error.message);
    } finally { checking = false; }
  }
  setInterval(checkSession, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkSession(); });
  window.addEventListener('focus', checkSession);
  window.addEventListener('pageshow', checkSession);
  window.crmSession = Object.freeze({ get authenticated() { return authenticated; }, lock });
  connect();
})();

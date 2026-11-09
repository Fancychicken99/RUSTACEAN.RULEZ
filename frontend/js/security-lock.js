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
  let afterRecoveryKey = null;

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
    byId('forgot-password').hidden = needsSetup || !status.database_encrypted;
    byId('recovery-form').hidden = true;
    byId('recovery-key-panel').hidden = true;
    byId('migration-notice').hidden = !status.legacy_copy_present || !status.database_encrypted;
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
    byId('recovery-form').reset();
    byId('recovery-form').hidden = true;
    byId('recovery-key-panel').hidden = true;
    byId('issued-recovery-key').value = '';
    byId('recovery-key-saved').checked = false;
    byId('continue-recovery-key').disabled = true;
    byId('change-password-form').reset();
    byId('migration-message').textContent = '';
    afterRecoveryKey = null;
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
        const result = await window.crmApi.setupAdmin(password);
        const status = await window.crmApi.getAuthStatus();
        if (requestVersion !== version) return;
        configureForm(status);
        showRecoveryKey(result.recovery_key, () => {
          configureForm(status);
          message('Your harbor is ready. Log in with your new password.');
          byId('password').focus();
        });
      } else {
        const correct = await window.crmApi.login(password);
        if (requestVersion !== version) {
          if (correct) await window.crmApi.logout();
          return;
        }
        if (correct) {
          const key = await window.crmApi.takeRecoveryKey();
          const status = await window.crmApi.getAuthStatus();
          if (requestVersion !== version) { await window.crmApi.logout(); return; }
          byId('migration-notice').hidden = !status.legacy_copy_present;
          if (key) showRecoveryKey(key, unlock);
          else unlock();
        }
        else message('Incorrect password.');
      }
    } catch (error) {
      if (requestVersion === version) message(error.message);
    } finally {
      busy = false;
      byId('submit-auth').disabled = false;
    }
  });
  function showRecoveryKey(key, next) {
    form.hidden = true;
    byId('forgot-password').hidden = true;
    byId('recovery-form').hidden = true;
    byId('recovery-key-panel').hidden = false;
    byId('auth-heading').textContent = 'Keep a way back to your harbor';
    message('Save this key before continuing. Losing both password and recovery key means losing access.');
    byId('issued-recovery-key').value = key;
    byId('recovery-key-saved').checked = false;
    byId('continue-recovery-key').disabled = true;
    afterRecoveryKey = next;
    byId('issued-recovery-key').focus();
    byId('issued-recovery-key').select();
  }
  byId('recovery-key-saved').addEventListener('change', event => {
    byId('continue-recovery-key').disabled = !event.target.checked;
  });
  byId('continue-recovery-key').addEventListener('click', async () => {
    if (!byId('recovery-key-saved').checked || !afterRecoveryKey) return;
    const next = afterRecoveryKey;
    afterRecoveryKey = null;
    byId('issued-recovery-key').value = '';
    byId('recovery-key-panel').hidden = true;
    try { await next(); } catch (error) { message(error.message); }
  });
  byId('forgot-password').addEventListener('click', () => {
    if (busy) return;
    form.hidden = true;
    byId('forgot-password').hidden = true;
    byId('recovery-form').hidden = false;
    byId('auth-heading').textContent = 'Find your way back';
    byId('password').value = '';
    message('Your recovery key resets access without erasing your records.');
    byId('recovery-code').focus();
  });
  byId('cancel-recovery').addEventListener('click', () => {
    if (busy) return;
    byId('recovery-form').reset();
    connect();
  });
  byId('recovery-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (byId('recovery-password').value !== byId('recovery-confirm').value) {
      message('New passwords do not match.'); byId('recovery-confirm').focus(); return;
    }
    const request = { recovery_key: byId('recovery-code').value, new_password: byId('recovery-password').value };
    byId('recovery-form').reset();
    busy = true;
    byId('submit-recovery').disabled = true;
    byId('cancel-recovery').disabled = true;
    const requestVersion = version;
    try {
      const result = await window.crmApi.recoverPassword(request);
      if (requestVersion !== version) return;
      const status = await window.crmApi.getAuthStatus();
      showRecoveryKey(result.recovery_key, () => {
        configureForm(status);
        message('Password reset. Log in with your new password.');
        byId('password').focus();
      });
    } catch (error) { if (requestVersion === version) message(error.message); }
    finally {
      request.recovery_key = ''; request.new_password = '';
      busy = false; byId('submit-recovery').disabled = false; byId('cancel-recovery').disabled = false;
    }
  });
  byId('change-password-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !authenticated) return;
    const status = byId('password-change-message');
    if (byId('new-password').value !== byId('new-password-confirm').value) {
      status.textContent = 'New passwords do not match.'; byId('new-password-confirm').focus(); return;
    }
    const request = { current_password: byId('current-password').value, new_password: byId('new-password').value };
    event.currentTarget.reset(); busy = true; byId('change-password-button').disabled = true;
    const requestVersion = version;
    try {
      const result = await window.crmApi.changePassword(request);
      if (requestVersion !== version) return;
      ++version;
      showLocked();
      const authStatus = await window.crmApi.getAuthStatus();
      showRecoveryKey(result.recovery_key, () => {
        configureForm(authStatus);
        message('Password updated. Log in with your new password.');
      });
    } catch (error) { if (requestVersion === version) status.textContent = error.message; }
    finally { request.current_password = ''; request.new_password = ''; busy = false; byId('change-password-button').disabled = false; }
  });
  byId('cleanup-original').addEventListener('click', async event => {
    if (busy || !authenticated || !window.confirm('The encrypted copy has been verified. Remove the original unencrypted database copy from this device? Your active encrypted records will remain.')) return;
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await window.crmApi.removeOriginalDatabase();
      byId('migration-notice').hidden = true;
    } catch (error) { byId('migration-message').textContent = error.message; }
    finally { button.disabled = false; }
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
  window.crmSession = Object.freeze({ get authenticated() { return authenticated; }, lock,
    async credentialChange(result) {
      ++version; showLocked();
      const status = await window.crmApi.getAuthStatus();
      showRecoveryKey(result.recovery_key, () => { configureForm(status); message('Workspace imported. Log in with your new password.'); byId('password').focus(); });
    },
  });
  connect();
})();

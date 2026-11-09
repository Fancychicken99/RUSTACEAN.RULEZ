// Windows smoke test against the real debug executable/WebView2, not mocked IPC.
// Build first with scripts/desktop.ps1 -Action Build. Test data is retained.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
let issuedRecoveryKey;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const releaseLaunchOnly = process.argv.includes('--release-launch-only');
const executable = path.resolve(__dirname, `../src-tauri/target/${releaseLaunchOnly ? 'release' : 'debug'}/rustacean_crm.exe`);
const idleOnly = process.argv.includes('--idle-only');
const authOnly = process.argv.includes('--auth-only');
const testDirectory = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'rustacean-desktop-smoke-'));
let child;
let socket;
let ciPolicyActive = false;
const ciPolicyKey = 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge\\WebView2\\AdditionalBrowserArguments';
let sequence = 0;
const pending = new Map();
const externalRequests = new Set();
const browserErrors = [];
const syntheticName = "Fictional Rowan O'Vale <em>Test</em>";
const syntheticOrganization = 'Fictional Aurora & Sons <Test>';
const editedName = 'Dr. Fictional Rowan Updated <em>Test</em> Jr.';
let createdId;
let organizationId;

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function until(check, label, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    if (child?.exitCode !== null) throw new Error('Executable exited before ' + label);
    await delay(100);
  }
  throw new Error('Timed out: ' + label);
}
function cdp(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const value = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
    .catch(error => { throw new Error('Evaluation failed: ' + expression.slice(0, 240) + '\n' + error.message); });
  if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
  return value.result.value;
}
async function launch() {
  const port = await freePort();
  const debugArguments = `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1 --use-fake-ui-for-media-stream --use-fake-device-for-media-stream --autoplay-policy=no-user-gesture-required`;
  if (process.env.RUSTACEAN_CI_WEBVIEW_POLICY === '1') {
    if (process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted') {
      throw new Error('Machine debugging policy is restricted to disposable GitHub-hosted CI.');
    }
    // Elevated WebView2 intentionally ignores environment-based debugging flags.
    // Scope the documented machine policy to this exe on the disposable VM only.
    const previous = spawnSync('reg.exe', ['query', ciPolicyKey, '/v', 'rustacean_crm.exe'], { windowsHide: true });
    if (previous.status === 0) throw new Error('Preserving an existing WebView2 application policy.');
    const policy = spawnSync('reg.exe', ['add', ciPolicyKey, '/v', 'rustacean_crm.exe', '/t', 'REG_SZ', '/d', debugArguments, '/f'], { windowsHide: true });
    if (policy.status !== 0) throw new Error('Could not configure CI WebView2 debugging policy.');
    ciPolicyActive = true;
  }
  child = spawn(executable, [], {
    windowsHide: true,
    env: { ...process.env, ...(!releaseLaunchOnly ? { RUSTACEAN_TEST_DATA_DIR: testDirectory } : {}),
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: debugArguments },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const appLog = fs.createWriteStream(path.join(testDirectory, `application-${port}.log`));
  child.stdout.pipe(appLog, { end: false });
  child.stderr.pipe(appLog, { end: false });
  child.on('close', () => appLog.end());
  child.on('error', error => console.error('Launch error:', error.message));
  let target;
  await until(async () => {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = targets.find(item => item.type === 'page' && (item.url.includes('tauri.localhost') || item.url.startsWith('tauri://localhost')));
      return Boolean(target);
    } catch { return false; }
  }, 'WebView2 CRM page', 60000);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const response = JSON.parse(event.data);
    if (response.method === 'Runtime.exceptionThrown') browserErrors.push(response.params.exceptionDetails.exception?.description ?? response.params.exceptionDetails.text);
    if (response.method === 'Log.entryAdded' && response.params.entry.level === 'error') browserErrors.push(response.params.entry.text);
    if (response.method === 'Network.requestWillBeSent') {
      const url = new URL(response.params.request.url);
      if (['http:', 'https:'].includes(url.protocol) && !['tauri.localhost', 'ipc.localhost'].includes(url.hostname)) externalRequests.add(url.href);
    }
    if (response.method === 'Page.javascriptDialogOpening') {
      const expected = response.params.type === 'confirm' && ['Confirm save this contractor?', 'Confirm save this organization?'].includes(response.params.message);
      if (!expected) browserErrors.push('Unexpected dialog: ' + response.params.message);
      cdp('Page.handleJavaScriptDialog', { accept: expected }).catch(error => browserErrors.push(error.message));
    }
    const waiting = pending.get(response.id);
    if (!waiting) return;
    pending.delete(response.id);
    if (response.error) waiting.reject(new Error(response.error.message));
    else waiting.resolve(response.result);
  });
  await cdp('Network.enable');
  await cdp('Runtime.enable');
  await cdp('Log.enable');
  await cdp('Page.enable');
  await until(() => evaluate("document.readyState === 'complete' && Boolean(window.crmApi) && Boolean(document.getElementById('auth'))"), 'initial CRM document');
  // Block the original remote CDN dependencies without blocking Tauri's own
  // HTTPS custom-protocol origin on Windows. Also assert no external requests.
  await cdp('Network.setBlockedURLs', { urls: ['*://cdn.jsdelivr.net/*', '*://unpkg.com/*', '*://fonts.googleapis.com/*', '*://fonts.gstatic.com/*'] });
  await cdp('Page.reload');
  await until(() => evaluate("Boolean(window.crmApi) && Boolean(document.getElementById('auth')) && !document.getElementById('auth').hidden && !document.getElementById('auth-form').hidden && !document.getElementById('submit-auth').disabled"), 'authentication UI');
}
async function waitForRecords() {
  await until(() => evaluate("!document.getElementById('workspace').hidden && (window.crmDirectory?.loaded ?? /^\\d+$/.test(document.querySelector('.metric-value')?.textContent || ''))") , 'saved records');
  if (await evaluate("!document.getElementById('view-contacts').classList.contains('d-none')")) await directoryReady();
}
async function directoryReady() {
  await until(() => evaluate("document.getElementById('contractor-table-body')?.dataset.loading === 'false'"), 'backend directory filter');
}
async function chooseRegion(region) {
  await evaluate(`document.getElementById('contractor-region-filter').value = ${JSON.stringify(region)}; document.getElementById('contractor-region-filter').dispatchEvent(new Event('change', { bubbles: true }))`);
  await directoryReady();
}
async function importSamples(added, skipped) {
  await evaluate("document.getElementById('settings-button').click()"); await modalShown('settings-modal');
  await evaluate("document.getElementById('sample-import-button').click()"); await modalShown('sample-import-modal');
  await fillForm('sample-import-form', {});
  await savedMessage(`Sample import complete: ${added} contractors and ${added ? 6 : 0} organizations added; ${skipped} contractors and ${skipped ? 6 : 0} organizations skipped.`);
  await modalClosed('sample-import-modal');
}
async function submit(password, confirmation = password) {
  await evaluate(`(() => {
    document.getElementById('password').value = ${JSON.stringify(password)};
    const confirmPassword = document.getElementById('confirm-password');
    if (confirmPassword.required) confirmPassword.value = ${JSON.stringify(confirmation)};
    document.getElementById('auth-form').requestSubmit();
  })()`);
  await until(() => evaluate("!document.getElementById('submit-auth').disabled"), 'authentication completion');
  if (await evaluate("!document.getElementById('recovery-key-panel').hidden")) {
    issuedRecoveryKey = await evaluate("document.getElementById('issued-recovery-key').value");
    assert.match(issuedRecoveryKey, /^[0-9a-f]{8}(?:-[0-9a-f]{8}){7}$/);
    await evaluate("document.getElementById('recovery-key-saved').checked=true;document.getElementById('recovery-key-saved').dispatchEvent(new Event('change'));document.getElementById('continue-recovery-key').click()");
  }
}
async function fillForm(formId, values, twice = false) {
  await evaluate(`(() => {
    const values = ${JSON.stringify(values)};
    for (const [id, value] of Object.entries(values)) {
      const input = document.getElementById(id);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const form = document.getElementById(${JSON.stringify(formId)});
    form.requestSubmit();
    ${twice ? 'form.requestSubmit();' : ''}
  })()`);
}
async function enterPhone(id, text, typeEachCharacter = false) {
  await evaluate(`(() => { const input = document.getElementById(${JSON.stringify(id)}); input.focus(); input.select(); })()`);
  for (const part of typeEachCharacter ? [...text] : [text]) await cdp('Input.insertText', { text: part });
  return evaluate(`document.getElementById(${JSON.stringify(id)}).value`);
}
async function phoneKey(key, code, virtualKeyCode) {
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtualKeyCode });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKeyCode });
}
async function modalShown(id) {
  await until(() => evaluate(`document.getElementById(${JSON.stringify(id)}).classList.contains('show')`), 'modal ' + id);
  // Bootstrap transitions must finish before a subsequent hide/show.
  await until(() => evaluate(`!bootstrap.Modal.getInstance(document.getElementById(${JSON.stringify(id)}))._isTransitioning`), 'modal transition');
}
async function modalClosed(id) {
  await until(() => evaluate(`getComputedStyle(document.getElementById(${JSON.stringify(id)})).display === 'none'`), 'closed modal ' + id);
}
async function savedMessage(text) {
  await until(() => evaluate(`document.getElementById('workspace-message').textContent === ${JSON.stringify(text)}`), text);
}
async function restartLogin() {
  await stop(); await launch(); await submit('fictional smoke password'); await waitForRecords();
}
async function stop() {
  socket?.close();
  if (child && child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await exited;
  }
  if (ciPolicyActive) {
    const removed = spawnSync('reg.exe', ['delete', ciPolicyKey, '/v', 'rustacean_crm.exe', '/f'], { windowsHide: true });
    if (removed.status !== 0) throw new Error('Could not remove CI WebView2 debugging policy.');
    ciPolicyActive = false;
  }
}
async function verifyRealInactivity() {
  await launch();
  await submit('fictional smoke password'); // One-time setup, then a separate login.
  await submit('fictional smoke password');
  await waitForRecords();
  await importSamples(60, 0);
  await evaluate("document.getElementById('nav-contacts').click()");
  await directoryReady();
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 56);
  // Start a fresh session after setup/import. No clock overrides, timeout changes,
  // synthetic activity, or protected requests during the subsequent idle period.
  await evaluate("window.crmSession.lock()");
  await submit('fictional smoke password');
  await waitForRecords();
  const started = performance.now();
  console.log('Real 15-minute idle check started. Leave this test window untouched.');
  while (performance.now() - started < 16 * 60 * 1000) {
    const state = await evaluate(`(async () => ({
      locked: !window.crmSession.authenticated,
      hidden: document.getElementById('workspace').hidden,
      inert: document.getElementById('workspace').inert,
      rows: document.querySelectorAll('.contractor-row').length,
      message: document.getElementById('message').textContent,
      backend: await window.crmApi.getAuthStatus()
    }))()`);
    const elapsed = performance.now() - started;
    if (state.locked) {
      assert.ok(elapsed >= 14 * 60 * 1000 + 55 * 1000, 'Must not lock substantially before 15 minutes.');
      assert.equal(state.hidden, true);
      assert.equal(state.inert, true);
      assert.equal(state.rows, 0, 'Loaded contractor rows must clear on expiry.');
      assert.equal(state.backend.authenticated, false);
      assert.match(state.message, /password|inactivity|expired/i);
      assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
      assert.equal(await evaluate("window.crmApi.recordActivity().catch(error => error.message)"), 'Login required');
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(testDirectory, 'inactivity-lock.png'), Buffer.from(screenshot.data, 'base64'));
      await submit('fictional smoke password'); await waitForRecords();
      assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 56);
      assert.deepEqual(browserErrors, []);
      assert.equal(externalRequests.size, 0);
      const report = { scenario: 'real-15-minute-inactivity', passed: true,
        elapsedSeconds: elapsed / 1000, completedAt: new Date().toISOString(),
        executable, limitations: ['No OS sleep/wake or disconnected-network verification.'] };
      fs.writeFileSync(path.join(testDirectory, 'inactivity-result.json'), JSON.stringify(report, null, 2));
      console.log('PASS: real 15-minute idle lock, cleared UI, protected-command rejection and re-login persistence.', report);
      console.log('Retained test data and screenshot:', testDirectory);
      return;
    }
    assert.equal(state.backend.authenticated, true, 'Backend must remain authenticated before expiry.');
    console.log(`Idle: ${Math.floor(elapsed / 1000)} seconds; workspace still open.`);
    await delay(30000);
  }
  throw new Error('Workspace did not lock within 16 minutes.');
}
const finalChecks = require('./test-final-ui.cjs')({evaluate,cdp,until,modalShown,modalClosed,fillForm,savedMessage,restartLogin,enterPhone,testDirectory});
(async () => {
  if (process.platform !== 'win32') throw new Error('This smoke test targets Windows/WebView2.');
  assert.ok(fs.existsSync(executable), 'Build the debug executable first.');
  if (releaseLaunchOnly) {
    if (idleOnly) throw new Error('Release launch check cannot run idle/mutation scenarios.');
    // Release ignores the debug data override and opens ordinary app data.
    // Observe startup only: do not submit setup/login/import or mutation forms.
    await launch();
    assert.equal(await evaluate("document.getElementById('workspace').hidden"), true);
    assert.equal(await evaluate("document.getElementById('workspace').inert"), true);
    assert.equal(await evaluate("window.crmApi.getAuthStatus().then(status => status.authenticated)"), false);
    assert.deepEqual(browserErrors, []);
    assert.equal(externalRequests.size, 0);
    const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(testDirectory, 'release-launch.png'), Buffer.from(screenshot.data, 'base64'));
    console.log('PASS: real release executable opened to the locked authentication UI; no login or data forms submitted.');
    console.log('Release uses ordinary app data. Screenshot:', testDirectory);
    return;
  }
  if (idleOnly) { await verifyRealInactivity(); return; }
  await launch();
  assert.equal(await evaluate("document.getElementById('auth-heading').textContent"), 'Set up local administrator');
  await finalChecks.login();
  assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.listOrganizations().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.recordActivity().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.createOrganization({name:'Fictional denied',region:null}).catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.createContractor({organization_id:1,profile:{full_name:'Fictional denied'}}).catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.updateContractor({id:1,profile:{full_name:'Fictional denied'}}).catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.archiveContractor({id:1}).catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.searchRecords({region:null}).catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.importSampleData().catch(error => error.message)"), 'Login required');
  await submit('fictional smoke password', 'different confirmation');
  assert.equal(await evaluate("document.getElementById('confirm-password').classList.contains('is-invalid')"), true);
  assert.equal(await evaluate("window.crmApi.getAuthStatus().then(status => status.admin_exists)"), false, 'Mismatched confirmation must not create an administrator.');
  await submit('short');

await until(
  () => evaluate(
    "document.getElementById('message').textContent.includes('at least 12')"
  ),
  'short password validation message'
);
  await submit('fictional smoke password');
  assert.equal(await evaluate("document.getElementById('auth-heading').textContent"), 'Log in');
  await submit('incorrect');
  assert.equal(await evaluate("document.getElementById('message').textContent"), 'Incorrect password.');
  await submit('fictional smoke password');
  await waitForRecords();
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '0');
  await evaluate("document.getElementById('nav-contacts').click()"); await directoryReady();
  assert.match(await evaluate("document.getElementById('contractor-table-body').textContent"), /No contractors have been saved/);
  assert.equal(await evaluate("document.getElementById('password').value"), '');
  assert.equal(await evaluate("window.crmApi.setupAdmin('replacement password').catch(error => error.message)"), 'Administrator already configured');
  if (authOnly) {
    // Focused real-executable verification; default CI still runs the full suite.
    await restartLogin();
    assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 0);
    assert.equal(externalRequests.size, 0, 'CRM must not attempt external HTTP(S) requests.');
    assert.deepEqual(browserErrors, [], 'Unexpected browser errors or CSP violations.');
    console.log('PASS: confirmation mismatch, short-password rejection, setup, wrong/correct login, one-time admin setup and restart persistence.');
    console.log('Artifacts:', testDirectory);
    return;
  }
  if (process.argv.includes('--final-only')) {
    // Focused regression for final UI changes; default CI retains the full suite.
    await evaluate('window.crmApi.importSampleData().then(() => window.crmDirectory.refresh())');
    const record = await evaluate("window.crmApi.listOrganizations().then(organizations=>window.crmApi.createContractor({organization_id:organizations[0].id,profile:{first_name:'Rowan',last_name:'Test',email:'review@example.com'}})).then(record=>window.crmDirectory.refresh().then(()=>record))");
    await finalChecks.finish(record);
    assert.equal(externalRequests.size, 0);
    assert.deepEqual(browserErrors, []);
    console.log('Final UI artifacts:', testDirectory);
    return;
  }
  const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(testDirectory, 'empty-directory.png'), Buffer.from(screenshot.data, 'base64'));
  await evaluate("document.querySelector('#view-contacts [data-bs-target=\"#add-contractor-modal\"]').click()");
  await modalShown('add-contractor-modal');
  assert.equal(await evaluate("document.getElementById('save-contractor').disabled"), true);
  assert.match(await evaluate("document.getElementById('contractor-form-message').textContent"), /Create an organization/);
  await evaluate("document.querySelector('#add-contractor-modal [data-bs-dismiss]').click()");
  await modalClosed('add-contractor-modal');
  // Create two organizations with the SAME name through actual UI commands.
  for (const region of ['Other Region', 'Test Region']) {
    await evaluate("document.getElementById('nav-organizations').click(); document.getElementById('add-organization').click()");
    await modalShown('organization-modal');
    if (region === 'Other Region') {
      await evaluate("document.getElementById('organization-contact-tab').click()");
      await until(() => evaluate("getComputedStyle(document.getElementById('organization-contact-pane')).opacity === '1'"), 'organization contact tab');
      assert.equal(await enterPhone('organization-phone', '+33142345678'), '+33 1 42 34 56 78');
      assert.equal(await enterPhone('organization-secondary-phone', '+919876543210'), '+91 98765 43210');
      await evaluate("document.getElementById('organization-secondary-phone').value = ''"); // Secondary persistence is a separate pending feature.
    }
    await fillForm('organization-form', { 'organization-name': syntheticOrganization, 'organization-region': region });
    await savedMessage('Organization saved.'); await modalClosed('organization-modal');
  }
  organizationId = await evaluate("window.crmApi.listOrganizations().then(orgs => orgs.find(org => org.region === 'Test Region').id)");
  assert.equal(await evaluate("window.crmApi.listOrganizations().then(orgs => orgs.find(org => org.region === 'Other Region').phone)"), '+33 1 42 34 56 78');
  await evaluate("document.getElementById('nav-contacts').click(); document.querySelector('#view-contacts [data-bs-target=\"#add-contractor-modal\"]').click()");
  await modalShown('add-contractor-modal');
  await fillForm('add-contractor-form', { 'contractor-first-name': 'Fictional', 'contractor-last-name': 'Contact Choice', 'contractor-role': 'Engineer', 'contractor-email': '', 'contractor-phone': '', 'contractor-organization': String(organizationId) });
  assert.equal(await evaluate("document.getElementById('contractor-form-message').textContent"), 'Enter a phone number or email address');
  await until(() => evaluate("document.getElementById('contractor-contact-pane').classList.contains('active')"), 'invalid contact tab revealed');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 0);
  await fillForm('add-contractor-form', { 'contractor-email': 'valid@example.com', 'contractor-phone': 'call me' });
  assert.match(await evaluate("document.getElementById('contractor-form-message').textContent"), /7 to 15 digits/);
  await fillForm('add-contractor-form', { 'contractor-email': 'not an email', 'contractor-phone': '+44 20 7946 0958' });
  assert.equal(await evaluate("document.getElementById('contractor-email').validity.typeMismatch"), true);
  for (const [raw, formatted] of [
    ['+442079460958', '+44 20 7946 0958'],
    ['+33142345678', '+33 1 42 34 56 78'],
    ['+919876543210', '+91 98765 43210'],
    ['+12025550123', '+1 202 555 0123'],
  ]) {
    assert.equal(await enterPhone('contractor-phone', raw, true), formatted);
    assert.equal(await evaluate("document.getElementById('contractor-phone').selectionStart === document.getElementById('contractor-phone').value.length"), true);
  }
  assert.equal(await enterPhone('contractor-phone', '+442079460958'), '+44 20 7946 0958', 'Bulk insertion must format without losing digits.');
  const maskScreenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(testDirectory, 'international-phone-mask.png'), Buffer.from(maskScreenshot.data, 'base64'));
  await evaluate("document.getElementById('contractor-phone').setSelectionRange(7, 11)");
  await cdp('Input.insertText', { text: '7123' });
  assert.equal(await evaluate("document.getElementById('contractor-phone').value"), '+44 20 7123 0958');
  assert.equal(await evaluate("document.getElementById('contractor-phone').selectionStart"), 11, 'Editing the middle must retain the caret in the middle.');
  await enterPhone('contractor-phone', '+442079460958');
  await evaluate("document.getElementById('contractor-phone').setSelectionRange(7, 7)");
  await phoneKey('Backspace', 'Backspace', 8);
  assert.equal(await evaluate("document.getElementById('contractor-phone').value.replace(/[^+0-9]/g, '')"), '+44279460958', 'Backspace across a separator deletes the preceding digit.');
  await enterPhone('contractor-phone', '+442079460958');
  await evaluate("document.getElementById('contractor-phone').setSelectionRange(3, 3)");
  await phoneKey('Delete', 'Delete', 46);
  assert.equal(await evaluate("document.getElementById('contractor-phone').value.replace(/[^+0-9]/g, '')"), '+44079460958', 'Delete across a separator deletes the following digit.');
  await enterPhone('contractor-phone', '+442079460958');
  await evaluate("(() => { const input = document.getElementById('contractor-phone'); input.setSelectionRange(input.value.length - 4, input.value.length); })()");
  await cdp('Input.insertText', { text: '0123' });
  assert.equal(await evaluate("document.getElementById('contractor-phone').value"), '+44 20 7946 0123');
  assert.equal(await enterPhone('contractor-phone', '202-555-0101'), '202-555-0101', 'Local numbers must not acquire an assumed country code.');
  assert.equal(await enterPhone('contractor-phone', '+44 invalid'), '+44 invalid', 'Invalid paste text must remain visible for validation.');
  await fillForm('add-contractor-form', { 'contractor-first-name': '   ', 'contractor-last-name': '   ', 'contractor-role': 'Engineer', 'contractor-email': 'rowan@example.com', 'contractor-phone': '+1 (202) 555-0105', 'contractor-organization': String(organizationId) });
  await until(() => evaluate("document.getElementById('contractor-form-message').textContent === 'First and last name are required'"), 'backend field validation');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 0);
  assert.equal(await evaluate("document.getElementById('contractor-first-name').value"), '   ');
  await fillForm('add-contractor-form', { 'contractor-first-name': 'Fictional', 'contractor-middle-name': 'Rowan', 'contractor-last-name': "O'Vale <em>Test</em>", 'contractor-organization': String(organizationId), 'contractor-role': 'Engineer', 'contractor-email': 'rowan@example.com', 'contractor-phone': '' }, true);
  await savedMessage('Contractor saved.'); await modalClosed('add-contractor-modal');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 1, 'Double submit must not create duplicates.');
  createdId = await evaluate("window.crmApi.listContractors().then(records => records[0].id)");
  assert.deepEqual(await evaluate("window.crmApi.listContractors().then(records => [records[0].first_name, records[0].middle_name, records[0].last_name, records[0].phone])"), ['Fictional', 'Rowan', "O'Vale <em>Test</em>", null]);
  assert.equal(await evaluate("document.querySelector('#contractor-profile-content h2').textContent"), syntheticName);
  await evaluate("document.getElementById('lock').click()");
  await until(() => evaluate("window.crmApi.getAuthStatus().then(status => !status.authenticated)"), 'logout');
  assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("document.getElementById('workspace').hidden"), true);
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 0);
  await stop();
  await launch();
  assert.equal(await evaluate("document.getElementById('auth-heading').textContent"), 'Log in');
  assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
  await submit('fictional smoke password');
  await waitForRecords();
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '1');
  assert.equal(await evaluate("document.getElementById('region-overview').textContent.includes('Test Region')"), true);
  await evaluate("document.getElementById('nav-contacts').click()"); await directoryReady();
  assert.equal(await evaluate("document.querySelector('.contractor-row td').textContent"), syntheticName);
  assert.equal(await evaluate("document.querySelector('.contractor-row td em') === null"), true);
  assert.equal(await evaluate("document.querySelector('.contractor-row td:nth-child(2)').textContent"), syntheticOrganization);
  assert.match(await evaluate("document.querySelector('.contractor-row td:nth-child(8)').textContent"), /Date unavailable/);
  await evaluate("document.querySelector('.contractor-row').click()");
  assert.equal(await evaluate("document.querySelector('#contractor-profile-content h2').textContent"), syntheticName);
  assert.equal(await evaluate("window.location.hash"), `#/contractors/${createdId}`);
  await cdp('Page.reload');
  await until(() => evaluate("Boolean(document.getElementById('auth-form')) && !document.getElementById('auth').hidden && !document.getElementById('auth-form').hidden"), 'reloaded locked page');
  await submit('fictional smoke password');
  await waitForRecords();
  assert.equal(await evaluate("document.querySelector('#contractor-profile-content h2').textContent"), syntheticName);
  await evaluate("document.getElementById('edit-contractor').click()"); await modalShown('add-contractor-modal');
  assert.equal(await evaluate("document.getElementById('contractor-organization').disabled"), true);
  assert.equal(await evaluate("document.getElementById('contractor-organization').value"), String(organizationId));
  assert.equal(await evaluate("document.getElementById('contractor-middle-name').value"), 'Rowan');
  await fillForm('add-contractor-form', { 'contractor-email': '', 'contractor-phone': '' });
  assert.equal(await evaluate("document.getElementById('contractor-form-message').textContent"), 'Enter a phone number or email address');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records[0].full_name)"), syntheticName);
  await fillForm('add-contractor-form', { 'contractor-prefix': 'Dr.', 'contractor-first-name': 'Fictional', 'contractor-last-name': 'Updated <em>Test</em>', 'contractor-suffix': 'Jr.', 'contractor-role': 'Consultant', 'contractor-email': '', 'contractor-phone': '+442079460958' });
  await savedMessage('Contractor saved.'); await modalClosed('add-contractor-modal');
  await restartLogin();
  const updated = await evaluate("window.crmApi.listContractors().then(records => records[0])");
  assert.equal(updated.full_name, editedName); assert.equal(updated.organization_id, organizationId);
  assert.equal(updated.role, 'Consultant'); assert.equal(updated.email, null); assert.equal(updated.phone, '+44 20 7946 0958');
  assert.deepEqual([updated.prefix, updated.first_name, updated.middle_name, updated.last_name, updated.suffix], ['Dr.', 'Fictional', 'Rowan', 'Updated <em>Test</em>', 'Jr.']);
  assert.equal(updated.status, 'Active');
  await evaluate("document.getElementById('nav-organizations').click()");
  assert.equal(await evaluate("document.querySelector('#organizations-table-body th').textContent"), syntheticOrganization);
  const otherOrganizationId = await evaluate("window.crmApi.listOrganizations().then(orgs => orgs.find(org => org.region === 'Other Region').id)");
  await evaluate(`document.querySelector('[data-organization-id="${otherOrganizationId}"] button').click()`);
  await directoryReady();
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 0, 'Duplicate names must not merge distinct organization rosters.');
  await evaluate("document.getElementById('nav-organizations').click()");
  await evaluate(`document.querySelector('[data-organization-id="${organizationId}"] button').click()`);
  await directoryReady();
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 1);
  // Exercise UI error handling and delayed-response protection, explicitly simulated.
  await evaluate("window.savedApi = window.crmApi; window.crmApi = { ...window.savedApi, listContractors: async () => { throw new Error('Controlled UI test failure'); } }; void window.crmDirectory.refresh()");
  await until(() => evaluate("document.getElementById('workspace-message').textContent === 'Controlled UI test failure'"), 'visible error');
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 0);
  await evaluate("window.crmApi = window.savedApi; void window.crmDirectory.refresh()");
  await waitForRecords();
  assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true, 'Window must not overflow horizontally.');
  const populatedScreenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(testDirectory, 'saved-directory.png'), Buffer.from(populatedScreenshot.data, 'base64'));
  await evaluate("window.pendingRecords = window.savedApi.listContractors(); window.crmApi = { ...window.savedApi, listContractors: () => new Promise(resolve => { window.releaseRecords = resolve; }) }; void window.crmDirectory.refresh()");
  await evaluate("document.getElementById('lock').click()");
  await until(() => evaluate("window.savedApi.getAuthStatus().then(status => !status.authenticated)"), 'final lock');
  await evaluate("(async () => { window.releaseRecords(await window.pendingRecords); window.crmApi = window.savedApi; })()");
  await delay(100);
  assert.equal(await evaluate("document.getElementById('workspace').hidden"), true);
  assert.equal(await evaluate(`document.getElementById('workspace').textContent.includes(${JSON.stringify(editedName)})`), false);
  await submit('fictional smoke password'); await waitForRecords();
  await evaluate("document.getElementById('nav-contacts').click()"); await directoryReady();
  await evaluate("document.querySelector('.contractor-row').click(); document.getElementById('edit-contractor').click(); window.crmSession.lock('Test lock with editor open.')");
  await until(() => evaluate("window.crmApi.getAuthStatus().then(status => !status.authenticated)"), 'lock with editor open');
  await modalClosed('add-contractor-modal');
  assert.equal(await evaluate("document.getElementById('contractor-first-name').value"), '');
  assert.equal(await evaluate("document.getElementById('contractor-organization').options.length"), 0);
  await submit('fictional smoke password'); await waitForRecords();
  await evaluate("document.getElementById('nav-contacts').click()"); await directoryReady();
  await evaluate("document.querySelector('.contractor-row').click(); document.getElementById('archive-contractor').click()");
  await modalShown('archive-modal');
  assert.equal(await evaluate("document.getElementById('archive-name').textContent"), editedName);
  await evaluate("document.querySelector('#archive-modal [data-bs-dismiss]').click()"); await modalClosed('archive-modal');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 1);
  await evaluate("document.getElementById('archive-contractor').click()"); await modalShown('archive-modal');
  await fillForm('archive-form', {});
  await savedMessage('Contractor archived. The record is retained.'); await modalClosed('archive-modal');
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 0);
  await restartLogin();
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '0');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 0);
  await stop();
  await launch(); await submit('fictional smoke password'); await waitForRecords();
  const retained = await evaluate(`window.crmApi.workspaceSnapshot().then(data=>data.archives.find(record=>record.kind==='contractor'&&record.id===${createdId}))`);
  assert.equal(retained.name,editedName);assert.ok(retained.archived_at);
  await evaluate("document.getElementById('settings-button').click()"); await modalShown('settings-modal');
  await evaluate("document.getElementById('sample-import-button').click()"); await modalShown('sample-import-modal');
  await evaluate("document.querySelector('#sample-import-modal [data-bs-dismiss]').click()"); await modalClosed('sample-import-modal');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 0, 'Cancel import must not write records.');
  await importSamples(60, 0);
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 56);
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '56');
  await evaluate("document.getElementById('nav-contacts').click()"); await directoryReady();
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 10, 'The first DataTables page must contain ten rows.');
  assert.equal(await evaluate("new DataTable(document.getElementById('contractor-table-body').closest('table')).rows().count()"), 56, 'Pagination must retain every saved record.');
  const firstPageId = await evaluate("document.querySelector('.contractor-row').dataset.contractorId");
  await evaluate("new DataTable(document.getElementById('contractor-table-body').closest('table')).page('next').draw('page'); void 0");
  assert.notEqual(await evaluate("document.querySelector('.contractor-row').dataset.contractorId"), firstPageId, 'Changing page must show different records.');
  await evaluate("new DataTable(document.getElementById('contractor-table-body').closest('table')).page('first').draw('page'); void 0");
  await evaluate("window.realFilter = window.crmApi.searchRecords; window.crmApi = { ...window.crmApi, searchRecords: async request => { window.lastRegion = request.region; const records = await window.realFilter(request); window.lastRegionResult = records.length; return records; } }; window.observedApi = window.crmApi; document.getElementById('nav-contacts').click()");
  await directoryReady();
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 56);
  await chooseRegion('East Nairobi');
  assert.equal(await evaluate("window.lastRegion"), 'East Nairobi');
  assert.equal(await evaluate("window.lastRegionResult"), 10);
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 10);
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '56', 'Filter must not change dashboard total.');
  await chooseRegion('Other Region');
  assert.equal(await evaluate("window.lastRegionResult"), 0);
  assert.match(await evaluate("document.getElementById('contractor-table-body').textContent"), /No contractors match/);
  await evaluate("history.replaceState(null, '', '#/contacts?region=Unmatched%20Region'); window.dispatchEvent(new PopStateEvent('popstate'))"); await directoryReady();
  assert.equal(await evaluate("window.lastRegion"), 'Unmatched Region');
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 0, 'A stale region link must not silently become All regions.');
  await evaluate("document.getElementById('clear-contractor-filters').click()"); await directoryReady();
  assert.equal(await evaluate("window.lastRegion"), null);
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 56);
  await evaluate("document.getElementById('filter-status').value = 'Deceased'; document.getElementById('filter-status').dispatchEvent(new Event('change', { bubbles: true }))"); await directoryReady();
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 6);
  await evaluate("document.getElementById('clear-contractor-filters').click()"); await directoryReady();
  assert.equal(await evaluate("(() => { const bounds = document.getElementById('settings-button').getBoundingClientRect(); return bounds.top >= 0 && bounds.bottom <= innerHeight; })()"), true, 'Settings must remain reachable alongside a long directory.');
  const sampleScreenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(testDirectory, 'imported-directory.png'), Buffer.from(sampleScreenshot.data, 'base64'));
  // Simulated filter failure must not display cached data as a successful result.
  await evaluate("window.crmApi = { ...window.observedApi, searchRecords: async () => { throw new Error('Controlled filter failure'); } }");
  await chooseRegion('East Nairobi');
  assert.equal(await evaluate("document.getElementById('directory-message').textContent"), 'Controlled filter failure');
  assert.equal(await evaluate("document.getElementById('contractor-result-count').textContent"), 'Unavailable');
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 0);
  await evaluate("window.crmApi = window.observedApi; document.getElementById('clear-contractor-filters').click()"); await directoryReady();
  // Delay an actual region query, then let a newer query finish first.
  await evaluate("window.crmApi = { ...window.observedApi, searchRecords: request => request.region === 'East Nairobi' ? new Promise(resolve => { window.releaseFilter = () => window.realFilter(request).then(resolve); }) : window.observedApi.searchRecords(request) }; document.getElementById('contractor-region-filter').value = 'East Nairobi'; document.getElementById('contractor-region-filter').dispatchEvent(new Event('change', { bubbles: true }))");
  await chooseRegion('North America');
  await evaluate("window.releaseFilter()"); await delay(100);
  assert.equal(await evaluate("[...document.querySelectorAll('.contractor-row td:nth-child(4)')].every(cell => cell.textContent === 'North America')"), true);
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 10);
  await evaluate("window.crmApi = window.observedApi; document.getElementById('clear-contractor-filters').click()"); await directoryReady();
  const sampleId = await evaluate("window.crmApi.listContractors().then(records => records.find(record => record.email === 'contractor001@example.com').id)");
  const legacyName = await evaluate(`window.crmApi.listContractors().then(records => records.find(record => record.id === ${sampleId}).full_name)`);
  // Prepare a legacy record with optional metadata via the real authenticated API.
  // A later UI edit must retain it, including values outside dropdown presets.
  const legacyRecord = await evaluate(`window.crmApi.listContractors().then(records => records.find(record => record.id === ${sampleId}))`);
  await evaluate(`window.crmApi.updateContractor(${JSON.stringify({ id: sampleId, profile: { full_name: legacyName, prefix: 'Capt.', first_name: null, middle_name: 'Stored middle metadata', last_name: null, suffix: 'PhD', role: legacyRecord.role, email: legacyRecord.email, phone: legacyRecord.phone } })}).then(() => window.crmDirectory.refresh())`);
  await evaluate(`window.crmDirectory.showProfile(${sampleId}); document.getElementById('edit-contractor').click()`); await modalShown('add-contractor-modal');
  assert.equal(await evaluate("document.getElementById('contractor-legacy-name').value"), legacyName);
  assert.equal(await evaluate("document.getElementById('contractor-first-name').disabled"), true);
  assert.equal(await evaluate("document.getElementById('contractor-first-name').value"), '');
  assert.equal(await evaluate("document.getElementById('contractor-prefix').value"), 'Capt.');
  assert.equal(await evaluate("document.getElementById('contractor-suffix').value"), 'PhD');
  assert.equal(await evaluate("document.getElementById('contractor-role').value"), legacyRecord.role);
  const legacyScreenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(testDirectory, 'legacy-name-editor.png'), Buffer.from(legacyScreenshot.data, 'base64'));
  await fillForm('add-contractor-form', { 'contractor-phone': '' });
  await savedMessage('Contractor saved.'); await modalClosed('add-contractor-modal');
  await restartLogin();
  assert.equal(await evaluate(`window.crmApi.listContractors().then(records => records.find(record => record.id === ${sampleId}).full_name)`), legacyName, 'Editing a legacy record must preserve all name words.');
  assert.deepEqual(await evaluate(`window.crmApi.listContractors().then(records => { const record = records.find(item => item.id === ${sampleId}); return [record.prefix, record.middle_name, record.suffix]; })`), ['Capt.', 'Stored middle metadata', 'PhD']);
  assert.equal(await evaluate(`window.crmApi.listContractors().then(records => records.find(record => record.id === ${sampleId}).role)`), legacyRecord.role);
  await evaluate(`window.crmDirectory.showProfile(${sampleId}); document.getElementById('edit-contractor').click()`); await modalShown('add-contractor-modal');
  await evaluate("document.getElementById('contractor-use-name-parts').click()");
  await fillForm('add-contractor-form', { 'contractor-first-name': 'Fictional', 'contractor-middle-name': '', 'contractor-last-name': 'User Edited Import', 'contractor-role': 'Engineer', 'contractor-email': 'contractor001@example.com', 'contractor-phone': '+1 (202) 555-0107' });
  await savedMessage('Contractor saved.'); await modalClosed('add-contractor-modal');
  await evaluate("document.getElementById('archive-contractor').click()"); await modalShown('archive-modal');
  await fillForm('archive-form', {}); await savedMessage('Contractor archived. The record is retained.'); await modalClosed('archive-modal');
  await importSamples(0, 60);
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 55);
  await restartLogin();
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '55');
  await evaluate("document.getElementById('nav-contacts').click()"); await directoryReady();
  await chooseRegion('East Nairobi');
  assert.equal(await evaluate("(() => { const table = document.getElementById('contractor-table-body')?.closest('table'); return table && window.DataTable?.isDataTable(table) ? new DataTable(table).rows().count() : document.querySelectorAll('.contractor-row').length; })()"), 9);
  await evaluate("document.getElementById('nav-organizations').click(); document.getElementById('add-organization').click()"); await modalShown('organization-modal');
  await evaluate("document.getElementById('toggle-inline-contractor').click()");
  assert.equal(await enterPhone('inline-contractor-phone', '+12025550123'), '+1 202 555 0123');
  await fillForm('organization-form', { 'organization-name': 'Fictional Inline Contact Org', 'inline-contractor-first-name': 'Fictional', 'inline-contractor-last-name': 'Inline Contact', 'inline-contractor-role': 'Engineer', 'inline-contractor-email': '', 'inline-contractor-phone': '' });
  assert.equal(await evaluate("document.getElementById('organization-form-message').textContent"), 'Enter a phone number or email address');
  assert.equal(await evaluate("window.crmApi.listOrganizations().then(records => records.some(record => record.name === 'Fictional Inline Contact Org'))"), false, 'Invalid inline contact must not create an organization.');
  // Late SQLite failure rollback is covered by final_workflows/profile backend
  // tests. Here exercise the real combined command and restart through the UI.
  await fillForm('organization-form', { 'inline-contractor-email': 'inline@example.com' });
  await savedMessage('Organization saved.'); await modalClosed('organization-modal');
  await restartLogin();
  const inline = await evaluate("window.crmApi.listContractors().then(records => records.find(record => record.email === 'inline@example.com'))");
  assert.deepEqual([inline.first_name, inline.last_name, inline.phone], ['Fictional', 'Inline Contact', null]);
  const inlineOrganizations = await evaluate("window.crmApi.listOrganizations().then(records => records.filter(record => record.name === 'Fictional Inline Contact Org'))");
  assert.equal(inlineOrganizations.length, 1);
  assert.equal(inline.organization_id, inlineOrganizations[0].id);
  const snapshot = await evaluate('window.crmApi.workspaceSnapshot()');
  const editedSample = snapshot.archives.find(record=>record.id===sampleId&&record.kind==='contractor');
  assert.equal(editedSample.name,'Fictional User Edited Import');assert.ok(editedSample.archived_at);
  assert.equal(snapshot.contacts.length,48);
  await finalChecks.finish(inline);
  await stop();
  assert.equal(externalRequests.size, 0, 'CRM must not attempt external HTTP(S) requests.');
  assert.deepEqual(browserErrors, [], 'Unexpected browser errors or CSP violations.');
  console.log('PASS: real UI organization/contractor create, field validation, double-submit protection, edit/restart, archive confirmation/cancel/restart and retained row; duplicate-name organization IDs; setup/login/lock, safe rendering and local assets.');
  console.log('PASS: simulated UI failure/retry and delayed response after lock.');
  console.log('PASS: explicit sample import/cancel/repeat preserves edits/archives after restart; real SQLite region filtering/no-match/clear with full dashboard totals; simulated filter failure and response ordering.');
  console.log('PASS: email-only create, international phone-only edit, full split-name restart persistence, invalid/both-empty contact rejection, legacy-name preservation and explicit conversion, inline email-only contractor restart.');
  console.log('PASS: international masks for UK/France/India/US, native character input/bulk insertion, caret/range replacement and separator deletion; local/invalid text retained; masked value persisted after restart.');
  console.log('Retained test data and screenshot:', testDirectory);
})().catch(async error => {
  console.error(error);
  if (socket?.readyState === WebSocket.OPEN) {
    try {
      console.error('UI diagnostic:', await evaluate("JSON.stringify({url:location.href, message:document.getElementById('message')?.textContent, ready:document.readyState})"));
      const failure = await cdp('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(testDirectory, 'failure.png'), Buffer.from(failure.data, 'base64'));
    } catch (diagnosticError) { console.error('Diagnostic failed:', diagnosticError.message); }
  }
  console.error('Browser errors:', browserErrors);
  console.error('Retained test data:', testDirectory);
  process.exitCode = 1;
})
  .finally(stop);

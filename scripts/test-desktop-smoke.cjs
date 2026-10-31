// Windows smoke test against the real debug executable/WebView2, not mocked IPC.
// Build first with scripts/desktop.ps1 -Action Build. Test data is retained.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const releaseLaunchOnly = process.argv.includes('--release-launch-only');
const executable = path.resolve(__dirname, `../src-tauri/target/${releaseLaunchOnly ? 'release' : 'debug'}/rustacean_crm.exe`);
const idleOnly = process.argv.includes('--idle-only');
const testDirectory = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'rustacean-desktop-smoke-'));
let child;
let socket;
let sequence = 0;
const pending = new Map();
const externalRequests = new Set();
const browserErrors = [];
const syntheticName = "Fictional Rowan O'Vale <em>Test</em>";
const syntheticOrganization = 'Fictional Aurora & Sons <Test>';
const editedName = 'Fictional Rowan Updated <em>Test</em>';
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
  const value = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
  return value.result.value;
}
async function launch() {
  const port = await freePort();
  child = spawn(executable, [], {
    windowsHide: true,
    env: { ...process.env, ...(!releaseLaunchOnly ? { RUSTACEAN_TEST_DATA_DIR: testDirectory } : {}),
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1` },
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
    const waiting = pending.get(response.id);
    if (!waiting) return;
    pending.delete(response.id);
    if (response.error) waiting.reject(new Error(response.error.message));
    else waiting.resolve(response.result);
  });
  await cdp('Network.enable');
  await cdp('Runtime.enable');
  await cdp('Log.enable');
  await until(() => evaluate("document.readyState === 'complete' && Boolean(window.crmApi) && Boolean(document.getElementById('auth'))"), 'initial CRM document');
  // Block the original remote CDN dependencies without blocking Tauri's own
  // HTTPS custom-protocol origin on Windows. Also assert no external requests.
  await cdp('Network.setBlockedURLs', { urls: ['*://cdn.jsdelivr.net/*', '*://unpkg.com/*', '*://fonts.googleapis.com/*', '*://fonts.gstatic.com/*'] });
  await cdp('Page.reload');
  await until(() => evaluate("Boolean(window.crmApi) && Boolean(document.getElementById('auth')) && !document.getElementById('auth').hidden && !document.getElementById('auth-form').hidden && !document.getElementById('submit-auth').disabled"), 'authentication UI');
}
async function waitForRecords() {
  await until(() => evaluate("document.getElementById('workspace-message').textContent.startsWith('Loaded ')") , 'saved records');
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
  await evaluate("document.getElementById('sample-import-button').click()"); await modalShown('sample-import-modal');
  await fillForm('sample-import-form', {});
  await savedMessage(`Sample import complete: ${added} contractors and ${added ? 6 : 0} organizations added; ${skipped} contractors and ${skipped ? 6 : 0} organizations skipped.`);
  await modalClosed('sample-import-modal');
}
async function submit(password) {
  await evaluate(`document.getElementById('password').value = ${JSON.stringify(password)}; document.getElementById('auth-form').requestSubmit();`);
  await until(() => evaluate("!document.getElementById('submit-auth').disabled"), 'authentication completion');
}
async function fillForm(formId, values, twice = false) {
  await evaluate(`(() => {
    const values = ${JSON.stringify(values)};
    for (const [id, value] of Object.entries(values)) document.getElementById(id).value = value;
    const form = document.getElementById(${JSON.stringify(formId)});
    form.requestSubmit();
    ${twice ? 'form.requestSubmit();' : ''}
  })()`);
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
}
async function verifyRealInactivity() {
  await launch();
  await submit('fictional smoke password'); // One-time setup, then a separate login.
  await submit('fictional smoke password');
  await waitForRecords();
  await importSamples(60, 0);
  await evaluate("document.getElementById('nav-contacts').click()");
  await directoryReady();
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 60);
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
      assert.match(state.message, /inactivity|expired/i);
      assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
      assert.equal(await evaluate("window.crmApi.recordActivity().catch(error => error.message)"), 'Login required');
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(testDirectory, 'inactivity-lock.png'), Buffer.from(screenshot.data, 'base64'));
      await submit('fictional smoke password'); await waitForRecords();
      assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 60);
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
  assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.listOrganizations().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.recordActivity().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.createOrganization({name:'Fictional denied',region:null}).catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.createContractor({organization_id:1,profile:{full_name:'Fictional denied'}}).catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.updateContractor({id:1,profile:{full_name:'Fictional denied'}}).catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.archiveContractor({id:1}).catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.filterContractors({region:null}).catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.importSampleData().catch(error => error.message)"), 'Login required');
  await submit('short');
  assert.match(await evaluate("document.getElementById('message').textContent"), /at least 12/);
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
    await fillForm('organization-form', { 'organization-name': syntheticOrganization, 'organization-region': region });
    await savedMessage('Organization saved.'); await modalClosed('organization-modal');
  }
  organizationId = await evaluate("window.crmApi.listOrganizations().then(orgs => orgs.find(org => org.region === 'Test Region').id)");
  await evaluate("document.getElementById('nav-contacts').click(); document.querySelector('#view-contacts [data-bs-target=\"#add-contractor-modal\"]').click()");
  await modalShown('add-contractor-modal');
  await fillForm('add-contractor-form', { 'contractor-full-name': '   ', 'contractor-organization': String(organizationId) });
  await until(() => evaluate("document.getElementById('contractor-form-message').textContent === 'Full name is required'"), 'backend field validation');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 0);
  assert.equal(await evaluate("document.getElementById('contractor-full-name').value"), '   ');
  await fillForm('add-contractor-form', { 'contractor-full-name': syntheticName, 'contractor-organization': String(organizationId), 'contractor-role': 'Integration engineer', 'contractor-email': 'rowan@example.com', 'contractor-phone': '202-555-0105' }, true);
  await savedMessage('Contractor saved.'); await modalClosed('add-contractor-modal');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 1, 'Double submit must not create duplicates.');
  createdId = await evaluate("window.crmApi.listContractors().then(records => records[0].id)");
  assert.equal(await evaluate("document.querySelector('#contractor-profile-content h2').textContent"), syntheticName);
  await evaluate("document.getElementById('lock').click()");
  await until(() => evaluate("window.crmApi.getAuthStatus().then(status => !status.authenticated)"), 'logout');
  assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("document.getElementById('workspace').hidden"), true);
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 0);
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
  assert.match(await evaluate("document.querySelector('.contractor-row td:last-child').textContent"), /Date unavailable/);
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
  await fillForm('add-contractor-form', { 'contractor-full-name': editedName, 'contractor-role': '', 'contractor-email': 'updated@example.com', 'contractor-phone': '202-555-0106' });
  await savedMessage('Contractor saved.'); await modalClosed('add-contractor-modal');
  await restartLogin();
  const updated = await evaluate("window.crmApi.listContractors().then(records => records[0])");
  assert.equal(updated.full_name, editedName); assert.equal(updated.organization_id, organizationId);
  assert.equal(updated.role, null); assert.equal(updated.email, 'updated@example.com'); assert.equal(updated.phone, '202-555-0106');
  assert.equal(updated.status, 'Active');
  await evaluate("document.getElementById('nav-organizations').click()");
  assert.equal(await evaluate("document.querySelector('#organizations-grid h2').textContent"), syntheticOrganization);
  const otherOrganizationId = await evaluate("window.crmApi.listOrganizations().then(orgs => orgs.find(org => org.region === 'Other Region').id)");
  await evaluate(`document.querySelector('[data-organization-id="${otherOrganizationId}"] button').click()`);
  await directoryReady();
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 0, 'Duplicate names must not merge distinct organization rosters.');
  await evaluate("document.getElementById('nav-organizations').click()");
  await evaluate(`document.querySelector('[data-organization-id="${organizationId}"] button').click()`);
  await directoryReady();
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 1);
  // Exercise UI error handling and delayed-response protection, explicitly simulated.
  await evaluate("window.savedApi = window.crmApi; window.crmApi = { ...window.savedApi, listContractors: async () => { throw new Error('Controlled UI test failure'); } }; document.getElementById('refresh-contractors').click()");
  await until(() => evaluate("document.getElementById('workspace-message').textContent === 'Controlled UI test failure'"), 'visible error');
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 0);
  await evaluate("window.crmApi = window.savedApi; document.getElementById('refresh-contractors').click()");
  await waitForRecords();
  assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true, 'Window must not overflow horizontally.');
  const populatedScreenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(testDirectory, 'saved-directory.png'), Buffer.from(populatedScreenshot.data, 'base64'));
  await evaluate("window.pendingRecords = window.savedApi.listContractors(); window.crmApi = { ...window.savedApi, listContractors: () => new Promise(resolve => { window.releaseRecords = resolve; }) }; document.getElementById('refresh-contractors').click()");
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
  assert.equal(await evaluate("document.getElementById('contractor-full-name').value"), '');
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
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 0);
  await restartLogin();
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '0');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 0);
  await stop();
  // Read-only inspection proves UI archive retained the stored row.
  const database = new DatabaseSync(path.join(testDirectory, 'crm.db'), { readOnly: true });
  const retained = database.prepare('SELECT full_name, archived_at FROM contractors WHERE id = ?').get(createdId);
  database.close();
  assert.equal(retained.full_name, editedName); assert.ok(retained.archived_at);
  await launch(); await submit('fictional smoke password'); await waitForRecords();
  await evaluate("document.getElementById('sample-import-button').click()"); await modalShown('sample-import-modal');
  await evaluate("document.querySelector('#sample-import-modal [data-bs-dismiss]').click()"); await modalClosed('sample-import-modal');
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 0, 'Cancel import must not write records.');
  await importSamples(60, 0);
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 60);
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '60');
  await evaluate("window.realFilter = window.crmApi.filterContractors; window.crmApi = { ...window.crmApi, filterContractors: async request => { window.lastRegion = request.region; const records = await window.realFilter(request); window.lastRegionResult = records.length; return records; } }; window.observedApi = window.crmApi; document.getElementById('nav-contacts').click()");
  await directoryReady();
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 60);
  await chooseRegion('East Nairobi');
  assert.equal(await evaluate("window.lastRegion"), 'East Nairobi');
  assert.equal(await evaluate("window.lastRegionResult"), 10);
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 10);
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '60', 'Filter must not change dashboard total.');
  await chooseRegion('Other Region');
  assert.equal(await evaluate("window.lastRegionResult"), 0);
  assert.match(await evaluate("document.getElementById('contractor-table-body').textContent"), /No contractors match/);
  await evaluate("history.replaceState(null, '', '#/contacts?region=Unmatched%20Region'); window.dispatchEvent(new PopStateEvent('popstate'))"); await directoryReady();
  assert.equal(await evaluate("window.lastRegion"), 'Unmatched Region');
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 0, 'A stale region link must not silently become All regions.');
  await evaluate("document.getElementById('clear-contractor-filters').click()"); await directoryReady();
  assert.equal(await evaluate("window.lastRegion"), null);
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 60);
  await evaluate("document.getElementById('filter-status').value = 'Deceased'; document.getElementById('filter-status').dispatchEvent(new Event('change', { bubbles: true }))"); await directoryReady();
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 6);
  await evaluate("document.getElementById('clear-contractor-filters').click()"); await directoryReady();
  assert.equal(await evaluate("(() => { const bounds = document.getElementById('sample-import-button').getBoundingClientRect(); return bounds.top >= 0 && bounds.bottom <= innerHeight; })()"), true, 'Import action must remain reachable alongside a long directory.');
  const sampleScreenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(testDirectory, 'imported-directory.png'), Buffer.from(sampleScreenshot.data, 'base64'));
  // Simulated filter failure must not display cached data as a successful result.
  await evaluate("window.crmApi = { ...window.observedApi, filterContractors: async () => { throw new Error('Controlled filter failure'); } }");
  await chooseRegion('East Nairobi');
  assert.equal(await evaluate("document.getElementById('directory-message').textContent"), 'Controlled filter failure');
  assert.equal(await evaluate("document.getElementById('contractor-result-count').textContent"), 'Unavailable');
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 0);
  await evaluate("window.crmApi = window.observedApi; document.getElementById('clear-contractor-filters').click()"); await directoryReady();
  // Delay an actual region query, then let a newer query finish first.
  await evaluate("window.crmApi = { ...window.observedApi, filterContractors: request => request.region === 'East Nairobi' ? new Promise(resolve => { window.releaseFilter = () => window.realFilter(request).then(resolve); }) : window.observedApi.filterContractors(request) }; document.getElementById('contractor-region-filter').value = 'East Nairobi'; document.getElementById('contractor-region-filter').dispatchEvent(new Event('change', { bubbles: true }))");
  await chooseRegion('North America');
  await evaluate("window.releaseFilter()"); await delay(100);
  assert.equal(await evaluate("[...document.querySelectorAll('.contractor-row td:nth-child(4)')].every(cell => cell.textContent === 'North America')"), true);
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 10);
  await evaluate("window.crmApi = window.observedApi; document.getElementById('clear-contractor-filters').click()"); await directoryReady();
  const sampleId = await evaluate("window.crmApi.listContractors().then(records => records.find(record => record.email === 'contractor001@example.com').id)");
  await evaluate(`document.querySelector('[data-contractor-id="${sampleId}"]').click(); document.getElementById('edit-contractor').click()`); await modalShown('add-contractor-modal');
  await fillForm('add-contractor-form', { 'contractor-full-name': 'Fictional User Edited Import' });
  await savedMessage('Contractor saved.'); await modalClosed('add-contractor-modal');
  await evaluate("document.getElementById('archive-contractor').click()"); await modalShown('archive-modal');
  await fillForm('archive-form', {}); await savedMessage('Contractor archived. The record is retained.'); await modalClosed('archive-modal');
  await importSamples(0, 60);
  assert.equal(await evaluate("window.crmApi.listContractors().then(records => records.length)"), 59);
  await restartLogin();
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '59');
  await evaluate("document.getElementById('nav-contacts').click()"); await directoryReady();
  await chooseRegion('East Nairobi');
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 9);
  await stop();
  const importedDatabase = new DatabaseSync(path.join(testDirectory, 'crm.db'), { readOnly: true });
  const editedSample = importedDatabase.prepare('SELECT full_name, archived_at FROM contractors WHERE id = ?').get(sampleId);
  assert.equal(editedSample.full_name, 'Fictional User Edited Import'); assert.ok(editedSample.archived_at);
  assert.equal(importedDatabase.prepare('SELECT COUNT(*) AS n FROM synthetic_contractors').get().n, 60);
  assert.equal(importedDatabase.prepare('SELECT COUNT(*) AS n FROM contact_events').get().n, 48);
  importedDatabase.close();
  assert.equal(externalRequests.size, 0, 'CRM must not attempt external HTTP(S) requests.');
  assert.deepEqual(browserErrors, [], 'Unexpected browser errors or CSP violations.');
  console.log('PASS: real UI organization/contractor create, field validation, double-submit protection, edit/restart, archive confirmation/cancel/restart and retained row; duplicate-name organization IDs; setup/login/lock, safe rendering and local assets.');
  console.log('PASS: simulated UI failure/retry and delayed response after lock.');
  console.log('PASS: explicit sample import/cancel/repeat preserves edits/archives after restart; real SQLite region filtering/no-match/clear with full dashboard totals; simulated filter failure and response ordering.');
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

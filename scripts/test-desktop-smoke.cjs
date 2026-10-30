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
const executable = path.resolve(__dirname, '../src-tauri/target/debug/rustacean_crm.exe');
const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rustacean-desktop-smoke-'));
let child;
let socket;
let sequence = 0;
const pending = new Map();
const externalRequests = new Set();
const browserErrors = [];
const syntheticName = "Fictional Rowan O'Vale <em>Test</em>";
const syntheticOrganization = 'Fictional Aurora & Sons <Test>';

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
    env: { ...process.env, RUSTACEAN_TEST_DATA_DIR: testDirectory,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1` },
    stdio: 'ignore',
  });
  child.on('error', error => console.error('Launch error:', error.message));
  let target;
  await until(async () => {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = targets.find(item => item.type === 'page' && (item.url.includes('tauri.localhost') || item.url.startsWith('tauri://localhost')));
      return Boolean(target);
    } catch { return false; }
  }, 'WebView2 CRM page');
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
}
async function submit(password) {
  await evaluate(`document.getElementById('password').value = ${JSON.stringify(password)}; document.getElementById('auth-form').requestSubmit();`);
  await until(() => evaluate("!document.getElementById('submit-auth').disabled"), 'authentication completion');
}
async function stop() {
  socket?.close();
  if (child && child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await exited;
  }
}
(async () => {
  if (process.platform !== 'win32') throw new Error('This smoke test targets Windows/WebView2.');
  assert.ok(fs.existsSync(executable), 'Build the debug executable first.');
  await launch();
  assert.equal(await evaluate("document.getElementById('auth-heading').textContent"), 'Set up local administrator');
  assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.listOrganizations().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("window.crmApi.recordActivity().catch(error => error.message)"), 'Login required');
  await submit('short');
  assert.match(await evaluate("document.getElementById('message').textContent"), /at least 12/);
  await submit('fictional smoke password');
  assert.equal(await evaluate("document.getElementById('auth-heading').textContent"), 'Log in');
  await submit('incorrect');
  assert.equal(await evaluate("document.getElementById('message').textContent"), 'Incorrect password.');
  await submit('fictional smoke password');
  await waitForRecords();
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '0');
  await evaluate("document.getElementById('nav-contacts').click()");
  assert.match(await evaluate("document.getElementById('contractor-table-body').textContent"), /No contractors have been saved/);
  assert.equal(await evaluate("document.getElementById('password').value"), '');
  assert.equal(await evaluate("window.crmApi.setupAdmin('replacement password').catch(error => error.message)"), 'Administrator already configured');
  const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(testDirectory, 'empty-directory.png'), Buffer.from(screenshot.data, 'base64'));
  await evaluate("document.getElementById('lock').click()");
  await until(() => evaluate("window.crmApi.getAuthStatus().then(status => !status.authenticated)"), 'logout');
  assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("document.getElementById('workspace').hidden"), true);
  assert.equal(await evaluate("document.querySelectorAll('.contractor-row').length"), 0);
  await stop();
  // Test setup only: seed an isolated database through SQLite, not the UI.
  // Contractor creation through the UI is outside this smoke test's scope.
  const database = new DatabaseSync(path.join(testDirectory, 'crm.db'));
  const organization = database.prepare('INSERT INTO organizations (name, region) VALUES (?, ?)').run(syntheticOrganization, 'Test Region');
  const contractor = database.prepare('INSERT INTO contractors (full_name, organization_id) VALUES (?, ?)').run(syntheticName, organization.lastInsertRowid);
  database.close();
  await launch();
  assert.equal(await evaluate("document.getElementById('auth-heading').textContent"), 'Log in');
  assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
  await submit('fictional smoke password');
  await waitForRecords();
  assert.equal(await evaluate("document.querySelector('.metric-value').textContent"), '1');
  assert.equal(await evaluate("document.getElementById('region-overview').textContent.includes('Test Region')"), true);
  await evaluate("document.getElementById('nav-contacts').click()");
  assert.equal(await evaluate("document.querySelector('.contractor-row td').textContent"), syntheticName);
  assert.equal(await evaluate("document.querySelector('.contractor-row td em') === null"), true);
  assert.equal(await evaluate("document.querySelector('.contractor-row td:nth-child(2)').textContent"), syntheticOrganization);
  assert.match(await evaluate("document.querySelector('.contractor-row td:last-child').textContent"), /Date unavailable/);
  await evaluate("document.querySelector('.contractor-row').click()");
  assert.equal(await evaluate("document.querySelector('#contractor-profile-content h2').textContent"), syntheticName);
  assert.equal(await evaluate("window.location.hash"), `#/contractors/${contractor.lastInsertRowid}`);
  await cdp('Page.reload');
  await until(() => evaluate("Boolean(document.getElementById('auth-form')) && !document.getElementById('auth').hidden && !document.getElementById('auth-form').hidden"), 'reloaded locked page');
  await submit('fictional smoke password');
  await waitForRecords();
  assert.equal(await evaluate("document.querySelector('#contractor-profile-content h2').textContent"), syntheticName);
  await evaluate("document.getElementById('nav-organizations').click()");
  assert.equal(await evaluate("document.querySelector('#organizations-grid h2').textContent"), syntheticOrganization);
  await evaluate("document.querySelector('#organizations-grid button').click()");
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
  assert.equal(await evaluate(`document.getElementById('workspace').textContent.includes(${JSON.stringify(syntheticName)})`), false);
  assert.equal(externalRequests.size, 0, 'CRM must not attempt external HTTP(S) requests.');
  assert.deepEqual(browserErrors, [], 'Unexpected browser errors or CSP violations.');
  console.log('PASS: real CRM executable setup/login/lock/restart; empty and persisted records; numeric profile route; organizations; safe text rendering; local assets with original CDN hosts blocked.');
  console.log('PASS: simulated UI failure/retry and delayed response after lock.');
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

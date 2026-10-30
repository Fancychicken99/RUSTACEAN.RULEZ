// Windows smoke test against the real debug executable/WebView2, not mocked IPC.
// Build first with scripts/desktop.ps1 -Action Build. Test data is retained.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const executable = path.resolve(__dirname, '../src-tauri/target/debug/rustacean_crm.exe');
const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rustacean-desktop-smoke-'));
let child;
let socket;
let sequence = 0;
const pending = new Map();

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
      target = targets.find(item => item.type === 'page' && item.url.includes('integration.html'));
      return Boolean(target);
    } catch { return false; }
  }, 'WebView2 integration page');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const response = JSON.parse(event.data);
    const waiting = pending.get(response.id);
    if (!waiting) return;
    pending.delete(response.id);
    if (response.error) waiting.reject(new Error(response.error.message));
    else waiting.resolve(response.result);
  });
  await until(() => evaluate("Boolean(window.crmApi) && !document.getElementById('auth').hidden && !document.getElementById('submit-auth').disabled"), 'authentication UI');
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
  await submit('short');
  assert.match(await evaluate("document.getElementById('message').textContent"), /at least 12/);
  await submit('fictional smoke password');
  assert.equal(await evaluate("document.getElementById('auth-heading').textContent"), 'Log in');
  await submit('incorrect');
  assert.equal(await evaluate("document.getElementById('message').textContent"), 'Incorrect password.');
  await submit('fictional smoke password');
  assert.equal(await evaluate("document.getElementById('empty').hidden"), false);
  assert.equal(await evaluate("document.getElementById('password').value"), '');
  assert.equal(await evaluate("window.crmApi.setupAdmin('replacement password').catch(error => error.message)"), 'Administrator already configured');
  const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(testDirectory, 'empty-directory.png'), Buffer.from(screenshot.data, 'base64'));
  await evaluate("document.getElementById('lock').click()");
  await until(() => evaluate("!document.getElementById('lock').disabled"), 'logout');
  assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
  assert.equal(await evaluate("document.getElementById('records').children.length"), 0);
  await stop();
  await launch();
  assert.equal(await evaluate("document.getElementById('auth-heading').textContent"), 'Log in');
  assert.equal(await evaluate("window.crmApi.listContractors().catch(error => error.message)"), 'Login required');
  await submit('fictional smoke password');
  assert.equal(await evaluate("document.getElementById('empty').hidden"), false);
  console.log('PASS: real executable setup, validation, wrong/correct login, empty SQLite results, one-time setup protection, logout, restart and persisted password.');
  console.log('Retained test data and screenshot:', testDirectory);
})().catch(error => { console.error(error); console.error('Retained test data:', testDirectory); process.exitCode = 1; })
  .finally(stop);

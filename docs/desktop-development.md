# Desktop executable development

The first Tauri 2 integration slice lives in src-tauri/. It depends on the
existing backend library and embeds frontend/ assets. Its initial window loads
frontend/integration.html, a small connected screen for administrator setup,
login, lock, and real contractor retrieval. Connor's original index.html remains
a separate fixture-based prototype until its flows are connected.

From the repository root:

```powershell
.\scripts\desktop.ps1 -Action Test
.\scripts\desktop.ps1 -Action Build
.\scripts\desktop.ps1 -Action Run
```

Build output on Windows: src-tauri/target/debug/rustacean_crm.exe.
Build once, then launch that executable directly without Cargo. It requires the
platform webview (WebView2 on Windows); no installer or release packaging has
been verified. The script accepts -Release for a future release build. The Cargo
lockfile pins desktop dependencies independently of backend/Cargo.lock.

Rust startup resolves Tauri's app_data_dir for identifier edu.rustacean.crm,
creates the directory, and opens crm.db there. Existing database functions own
schema initialization. Never seed from the backend demonstration executable.

Fresh databases require first-password setup (at least 12 Rust characters), then
login. No hardcoded password or automatic seed import is used. Empty contractor
lists are legitimate success. Passwords are cleared from the form after submit.
Lock clears displayed records and calls backend logout. Backend sessions expire
15 minutes after the last authorized backend action; status polling does not
extend the timeout. Polling clears an expired display within about five seconds.
General mouse/keyboard activity renewal is not implemented yet, so this is not
final inactivity-flow acceptance. A new process starts locked.

All Rust commands are registered in main.rs and delegate through commands.rs to
existing backend modules. Commands contain no SQL. A shared mutex serializes
session and database access. CSP limits the initial screen to local assets and
Tauri IPC; there are no filesystem/shell/network plugins enabled. The native
icon is a plain generated placeholder, not final branding.

## Test isolation and limitations

Debug builds only honor RUSTACEAN_TEST_DATA_DIR when it is an absolute directory.
Use a fresh test-owned temporary directory; never point tests at ordinary user
data. Release builds always use app_data_dir and ignore that override. No reset
command is exposed. Test cleanup must be limited to directories the test creates.

Rust bridge tests use temporary databases and actual backend functions. They
verify setup, incorrect passwords, login, list results, logout, and database
reopen behavior. This is not UI-driven E2E evidence by itself.

After building, run the actual Windows executable smoke test with Node 24:

```powershell
node scripts/test-desktop-smoke.cjs
```

It launches the debug executable with a fresh temporary data directory, exposes
a localhost WebView2 debugging port for that test process, and drives the real
UI/IPC using Node's built-in WebSocket/fetch APIs. It closes the executable and
restarts it to verify persisted credentials and a fresh locked session. Test
data and a screenshot are retained at the printed temporary path. Do not expose
that port for ordinary use. No additional Node packages or browser mock are used.

Verified October 29, 2026 on this Windows device: locked Cargo test (one bridge
workflow), debug executable build, and real executable smoke test all passed.
The smoke test covers empty results; real nonempty records and reopen were
verified in the Rust bridge workflow, not via the UI. Screenshot inspected.
Session-expiry timing, network-disconnected launch, release packaging, and other
operating systems have not been verified. Tauri resolved to 2.12.5; see Cargo.lock.

Create/edit/archive, organization selection, filters, media, quick actions,
full CRM rendering, synthetic database import, installers, and macOS/Linux
builds are still pending. See ipc-contract.md, integration-changes.md, and the
current personal checkpoint for implementation and verification status.

API references checked during implementation:
- https://v2.tauri.app/develop/calling-rust/
- https://v2.tauri.app/reference/config/
- https://v2.tauri.app/security/capabilities/

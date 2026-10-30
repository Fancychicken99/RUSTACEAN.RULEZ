# Desktop executable development

src-tauri/ depends on the existing backend crate and embeds frontend/ assets.
The default window now loads frontend/index.html: the original Northstar layout
connected to real local authentication and SQLite contractor/organization lists.
The earlier integration.html screen is retained but is not the default entry.

## Build, test, run

```powershell
.\scripts\desktop.ps1 -Action Test
.\scripts\desktop.ps1 -Action Build
.\scripts\desktop.ps1 -Action Run
node scripts/test-desktop-smoke.cjs
```

Run from repository root. Build output on Windows is
src-tauri/target/debug/rustacean_crm.exe. Launch directly after building. The
platform webview (WebView2 on Windows) is required. Installer/release packaging
and other OS builds are not verified. -Release is available for a later release
build. The desktop Cargo.lock pins dependencies independently of backend/.

Startup resolves app_data_dir for identifier edu.rustacean.crm, creates it, and
opens crm.db. Backend functions own schema initialization and SQL. No automatic
seed import is performed; do not use the demo executable to set up app test data.

## Authentication and loaded records

Fresh databases require a local password (at least 12 Rust characters), then
login. No hardcoded password. The workspace starts hidden/inert and opens only
after a successful login. A page reload relocks an existing process session.

security-lock.js owns the frontend auth state and emits crm:unlocked/crm:locked.
contractor-list.js requests real contractors and organizations on unlock and
Refresh. Pending request generations are invalidated on lock; records, profile
content, search/filters, and dynamic lists are cleared. Failures show an error and
permit retry, with no fixture fallback. Backend access checks remain authoritative.

The timeout is 15 minutes, pending client agreement. Trusted pointer/keyboard/input
activity resets the frontend idle timer and renews the backend session at most
once per 30 seconds through record_activity. Status checks every five seconds
never renew it. An expired/locked backend session cannot be renewed. Visibility
changes check elapsed idle time. Explicit lock hides/clears data immediately and
calls logout; a backend failure is shown without reopening the workspace.
Actual 15-minute timing and sleep/wake behavior still need system testing.

Bootstrap 5.3.3, Icons 1.11.3 and fonts are vendored with licenses. Original
stylesheet/script integrity hashes match the vendored files. Early theme setup
is an external local script, and inline page styles were moved into CSS to
preserve the executable's CSP. No shell/filesystem/network plugins are enabled.
The native icon remains a generated placeholder.

## Real executable smoke test

Requires Windows/WebView2 and Node 24; no extra Node packages. The runner creates
a fresh temporary directory and launches only its own debug process with a
localhost WebView2 debugging port. It drives the real UI/IPC using CDP. It
restarts the executable to verify persisted credentials and relocking. Test-only
setup now creates organizations/contractors through actual forms and registered
commands. node:sqlite performs only a read-only inspection after archive to prove
the row remains stored. No direct SQL seed writes are used by the current test.

Debug builds only honor absolute RUSTACEAN_TEST_DATA_DIR. Release builds always
use app_data_dir. No reset/seed command is exposed to the production frontend.
The test closes its own processes and retains database/screenshots at the printed
path. Failed runs capture UI diagnostics. Do not expose the debugging port in
ordinary use. Build products, databases, and generated schemas are ignored.

The smoke test checks empty and persisted lists, dashboard counts, numeric profile
routes and reload, organizations/roster, literal rendering of markup-like names,
lock clearing (including an open editor), and restart. It saves two same-name
organizations, creates a contractor in the selected one, checks validation and
double-submit protection, edits fields, restarts and verifies persistence, then
cancels/confirms archive and restarts again. CDN hosts used by the original page are blocked and
external HTTP(S) requests are tracked. This is not an OS network-disconnected
launch test. Controlled failure/retry and delayed responses after lock are
explicitly simulated UI conditions, separate from the real IPC checks.

Rust bridge tests cover actual saved record reopening, setup/login/logout,
organizations/activity authorization, and rejection of activity after expiry.
They are not UI tests. Backend profiles.rs now owns validated atomic save
workflows. New backend tests verify rollback on a controlled second-write failure
and archive/edit persistence; response queries include organization_id.

## Still pending

Organization update/archive, contractor transfer/status workflows; backend
region-filter command wiring;
repeatable persisted synthetic import; country/city/media/history/quick actions;
full timeout/offline/release/platform testing. The directory response currently
includes organization_id; duplicate organization names remain distinct in
rosters, counts, filters, and form selections. Filters in the current
UI act on loaded records and do not establish backend-filter acceptance.

API references:
- https://v2.tauri.app/develop/calling-rust/
- https://v2.tauri.app/reference/config/
- https://v2.tauri.app/security/capabilities/

## Saved profile workflow

From Organizations, add an organization (name required, region optional). Add a
contractor with full name and an organization; role/email/phone are optional.
Country/city/photo inputs are not offered until their storage/display contracts
exist. Region is inherited from organization. Profile Edit updates name/contact
fields and preserves organization/status. Archive asks for confirmation and keeps
the row in SQLite while hiding it from the directory. No permanent deletion.

The frontend waits for command completion, disables duplicate submissions,
retains values on validation failures, and refreshes records after committed
changes. Errors remain visible in the dialog. Lock clears/inerts/closes editors;
late save completions cannot reopen them. Closing an editor during an active
request is blocked; this does not cancel a transaction already authorized.

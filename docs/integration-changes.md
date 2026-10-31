# MVP integration changes

## Ownership and recording rule — October 29, 2026

Broughnut explicitly owns all remaining work needed to achieve the MVP, including
frontend/backend edits, missing behavior, packaging, and verification. Do not
defer necessary work to Connor or Josseline. Their original ownership identifies
the source of existing code, not a restriction on authorized implementation.

For each meaningful integration change, record affected files, what changed,
why it was needed, checks performed, and remaining limitations here. Explain
contract changes in ipc-contract.md as well. Keep entries factual; prototype
behavior and simulated tests do not establish executable functionality.
This instruction does not authorize automatic commits, pushes, or handoff out.

## Repository organization and initial JavaScript boundary

Status at cleanup milestone: implemented; included in the reviewed bridge
checkpoint. The later entry records the now-working executable.

| Affected files | What changed and why |
| --- | --- |
| Root HTML/CSS/JS moved to frontend/, frontend/css/, frontend/js/ | Group frontend assets into a dedicated future webview asset directory, separate from Rust source/docs. |
| frontend/index.html | Updated relative stylesheet/script paths and loaded the extracted fixture script before the page controller. |
| frontend/js/contractor-list.js; frontend/fixtures/demo-data.js | Moved 50 existing fictional contractor records and five organizations out of rendering code. Controller explicitly reads fixtures; record values were preserved. This is not a database import or backend fallback. |
| frontend/js/tauri-api.js | Replaced unused get_contractors/filterJson table-rendering helper with promise wrappers for auth status, admin setup, login/logout, and list_contractors. Keep IPC separate from rendering and propagate errors. Commands are not registered yet and pages do not load the wrapper yet. |
| backend-prototype/ moved to backend/ | Give the reusable Rust crate a stable directory for the future Tauri dependency. Rust sources, tests, manifest/lock, and package name are unchanged, ignoring checkout line endings. |
| Backend handoff and reference example moved under docs/ | Distinguish reference material from compiled implementation. Added a note explaining historical backend status. |
| scripts/test-backend.ps1; README.md; affected docs; root .gitignore | Update paths, document the new layout and known limitations, and exclude build products/local databases. |

Verification: all 27 backend tests passed after the move. Frontend JavaScript
parses; index local asset references resolve; fixture load order is correct;
extracted records match the original fixtures. Simulated wrapper checks covered
command routing, password preservation, empty/results, unavailable runtime, and
error propagation. Rust source/test/manifest contents compared against HEAD with
line endings normalized. Whitespace checks passed.

Limitations: no visual browser or desktop E2E verification; CDN assets, missing
images/logos, static profile fragment, and demo lock behavior remain. Existing
screens still use fixtures. The next step is Tauri startup and real commands,
then connecting authentication and contractor listing.

## First runnable Windows Tauri bridge — October 29, 2026

Status: implemented and verified; included in the user-authorized bridge
checkpoint commit. This supersedes the
previous entry's statement that no executable exists.

| Files | What changed and why |
| --- | --- |
| src-tauri/Cargo.toml, Cargo.lock, build.rs, tauri.conf.json, icons/ | Added Tauri 2.12.5 native project, local backend dependency, embedded frontend assets, local-only CSP, and placeholder native icon. Creates the executable without requiring a JavaScript bundler. Installer bundling remains disabled. |
| src-tauri/src/main.rs | Opens initialized SQLite in Tauri's portable app data directory, manages shared state, and registers the five commands. Debug-only absolute RUSTACEAN_TEST_DATA_DIR supports isolated tests; release ignores it. |
| src-tauri/src/commands.rs | Typed auth-status response, setup/login/logout/list commands, safe error mapping, and serialized database/session access. Calls Josseline's existing functions without changing backend source or adding SQL to commands. Includes real temporary-database bridge workflow test. |
| frontend/integration.html, frontend/css/integration.css, frontend/js/integration.js | Added small self-contained screen to exercise real IPC before wiring the original CRM dashboard. Supports first-password setup, login, lock, refresh, empty results, and safe text rendering. Clears records on lock/failure/observed expiry and clears password input after submission. Existing fixture screens are unchanged by this slice. |
| scripts/desktop.ps1 | Adds locked Test/Build/Run commands and optional release switch. |
| scripts/test-desktop-smoke.cjs | Windows UI-driven smoke test using the actual executable, disposable database, and localhost WebView2 CDP. Tests setup validation, wrong/correct login, protected empty list, one-time setup, lock and restart/persisted password. Retains test artifacts; stops only its launched processes. |
| README and desktop-development/ipc-contract/rust-development/e2e-test-plan docs | Records actual executable status, API fields/errors, build/run/test commands and limitations. Updated ownership to Broughnut for remaining work. |

Checks passed: cargo fmt; locked bridge test (one workflow); locked debug build;
real executable smoke test; JavaScript syntax. Inspected the captured empty-list
window screenshot. Original 27 backend tests passed earlier after the directory
move; no backend source was changed by this slice. Build emitted a non-fatal
incremental-cache hard-link warning and copied cache files instead.

The Rust workflow also verifies actual saved contractor retrieval/reopen and
failed login locking an existing session. The UI smoke test verifies an empty
database, not populated records or contractor CRUD. Test database/screenshot path
is printed by the runner; no ordinary application database is used for tests.

Remaining: connect the original CRM UI; create/edit/archive/organization/filter
commands; 50+ synthetic persisted profiles; UI activity renewal; media/quick
actions/final-scope features; release installers and macOS/Linux. Current timeout
is 15 minutes since backend activity, with five-second UI status polling. Expiry
timing and network-disconnected launch have not been tested. This is a first
working connection, not completed MVP acceptance.

## Original CRM layout connected — October 29, 2026

Status: reviewed and verified; included in the explicitly requested HANDOFF OUT
commit following 89cfcb8. Push outcome is reported separately.

| Files | What changed and why |
| --- | --- |
| frontend/index.html | Made original layout the connected entry point. Added password setup/login UI, initial hidden/inert workspace, Refresh/Lock/logout controls and status messages. Removed fixture loading and invented totals/activity; disabled creation controls until save commands exist. Unsupported country/city filters are disabled. |
| frontend/js/contractor-list.js | Replaced fixture arrays with real contractor/organization requests. Uses full_name, organization_name and numeric IDs explicitly; fixes profile route restoration. Builds counts/regions/options from saved records, shows empty/error/loading states, and supports retry. Clears records/profile/search/options on lock and ignores late responses. Duplicate organization-name rosters/counts are unavailable rather than merged incorrectly. |
| frontend/js/security-lock.js | Replaced demo password/visual-only lock with real setup/login/logout/session checks. Trusted UI activity renews an existing backend session at most every 30 seconds; status polling does not. Keeps a 15-minute UI idle timer, clears data on lock, and checks visibility changes. Does not claim verified full-duration/sleep behavior. |
| frontend/js/theme-init.js; frontend/css/styles.css | Moved early inline theme script to a local file and inline styles to CSS for CSP compatibility. Added auth styling and responsive topbar adjustments. Fixed existing mojibake in generated footer text. |
| frontend/js/tauri-api.js; src-tauri/src/commands.rs and main.rs | Added registered list_organizations and record_activity commands/wrappers using existing backend functions. Requires authorization for both. Added organization/activity checks and an expired-session test. Backend source/SQL/schema unchanged. |
| frontend/vendor/ | Vendored existing Bootstrap 5.3.3 and Icons 1.11.3 CSS/JS/fonts with MIT licenses and provenance. Bootstrap CSS/JS match original integrity hashes; no library upgrade. |
| src-tauri/tauri.conf.json | Default window now opens index.html, not the minimal integration screen; CSP remains restrictive. |
| scripts/test-desktop-smoke.cjs | Real executable checks now cover populated records/organizations/profiles/routes and literal markup-like text. Direct SQLite inserts are test setup only. Blocks original CDN hosts, tracks external requests, and checks layout/CSP errors. Separately simulates UI request failure/retry and delayed completion after lock. |
| README; desktop-development/ipc-contract/e2e-test-plan docs; personal notes | Updated run/verification instructions, contracts, limitations, ownership, and resume context. |

Rust tests passed: two bridge workflows, including protected organization access
and activity failing to revive an expired session. Debug executable built.
Main-window smoke checks passed before final presentation adjustments; final
verification results are recorded in the session checkpoint. No backend source
changed, so the previously passing 27 backend tests were not repeated.

Existing layout and backend were reused. Controls not connected yet are disabled
or marked unavailable, with no fake success or fixture fallback. Client-side
filtering of loaded records does not establish backend-filter acceptance. Final
MVP still needs create/edit/archive/organization setup, backend filter wiring,
repeatable 50+ synthetic import, and final inactivity/offline/platform evidence.

Final verification for the original-layout slice: two locked Rust bridge tests
passed; locked debug build passed; final real-window smoke test passed with zero
external HTTP(S) requests, browser errors/CSP violations, or page overflow.
Final directory screenshot inspected. Artifacts retained at the path recorded
in session-handoff.md. Source is included in this handoff commit; no backend
source/schema changed. Node syntax, local asset/font resolution, cargo fmt and diff checks pass.

## Contractor save/edit/archive and organization creation — October 30, 2026

Status: implemented and verified; included in the explicitly authorized
create/edit/archive milestone commit after 2e36c00. Push outcome reported separately.

| Files | What changed and why |
| --- | --- |
| backend/src/database.rs | Added nullable organization_id to Contractor and a single-record get_contractor query. Stable IDs allow correct editing/rosters when organization names repeat. No schema migration: the column already existed. |
| backend/src/search.rs, filtering.rs, skills.rs, decay.rs | Included organization_id in SELECTs and row mappings so every Contractor response has the same serializable shape. |
| backend/src/profiles.rs; backend/src/lib.rs | Added a registered backend module for validation/normalization and atomic create/update transactions. Reuses existing contractor creation/archive functions; keeps SQL and transaction ownership out of the bridge. Added organization creation with nullable region and useful domain errors. |
| backend/tests/profile_workflows.rs | Tests complete profile/edit/archive persistence, duplicate-name organization identity, invalid/archived organizations, validation, and rollback when the second create write fails. |
| src-tauri/src/commands.rs and main.rs; frontend/js/tauri-api.js | Added four typed authenticated commands and wrappers: create_contractor, update_contractor, archive_contractor, create_organization. Reject unknown request fields, unsafe IDs and bad inputs; map internal errors without SQL details. Added authorization/mutation bridge test. |
| frontend/index.html; frontend/js/add-contractor.js | Replaced console-only form behavior with actual add/edit, organization creation, and archive confirmation dialogs. Uses a full-name field and only persisted fields. Region comes from organization. Await completion, guard duplicate submissions, preserve failed inputs, distinguish successful save from failed refresh, and clear/inert/close dialogs on lock. |
| frontend/js/contractor-list.js | Enabled create actions, added profile Edit/Archive actions and stable record selectors, exported small rendering/refresh interface, and changed organization filters/counts/rosters from names to IDs. Removed duplicate-name ambiguity workaround. |
| frontend/js/security-lock.js | Blur active controls before hiding; works with editor lock cleanup. A transitioning dialog is closed after its shown event if the session locked meanwhile. |
| scripts/test-desktop-smoke.cjs | Creates organizations and contractor through the actual UI (no SQL seeding), validates errors/double submit, edits and restarts, checks duplicate-name roster separation, locks an open editor, cancels/confirms archive, restarts again. Read-only SQLite inspection confirms the archived row remains. |
| README; contract/development/E2E docs; personal notes | Updated exact request fields, supported edits, validation/nullability/errors, evidence, remaining work and resume context. E2E archive scenario now matches the SOW rather than implying permanent delete. |

Verification: all 29 backend tests and three bridge tests passed; locked debug
executable rebuilt. Final real-executable smoke run passed UI create/edit/archive
and restart checks, editor lock clearing, duplicate-name IDs, safe rendering,
no unexpected browser errors/CSP violations/page overflow, and no external HTTP(S)
requests while original CDN hosts were blocked. Failure/retry and delayed list
response checks are explicitly simulated; the mutation flows are real IPC.
Final screenshot inspected. Tests only touch fresh test-owned temporary databases;
latest artifacts are recorded in session-handoff.md. Normal application data is
untouched. Existing non-fatal incremental hard-link warnings remain.

Current editor supports full name, role, email, phone, with organization selected
at creation. Updating organization/status is intentionally not part of this
request: transfers/status changes need their separate history workflows. Archive
retains row/status and sets archived_at. Organization update/archive and restore
UI are not added. Country/city/photo inputs are not accepted or silently dropped.
Next: backend-filter wiring and deterministic persisted synthetic import, followed
by remaining MVP acceptance evidence. No completion/security/offline guarantees
beyond the recorded checks.

## Region filtering and repeatable fictional import — October 30, 2026

Status: reviewed and verified; included in the explicitly requested HANDOFF OUT
commit following 3c027d8. Push outcome reported separately. Includes the
user-requested develop-and-learn workflow updates in personal docs.

| Files | What changed and why |
| --- | --- |
| src-tauri/src/commands.rs, main.rs; frontend/js/tauri-api.js | Added authenticated filter_contractors and import_sample_data commands/wrappers. Region is optional, trimmed/validated, and passed to the existing SQLite search function. No arbitrary import file/path payload. Added protected filter/import bridge test. |
| frontend/js/contractor-list.js | Directory region changes and clear now await backend results. Full-list data stays separate for totals/profiles. Added query generations, loading/error/no-match states and explicit unavailable counts on failure; stale responses ignored. Saved unknown region links remain actual queries rather than falling back to All. Local search/status/organization filters narrow SQL results only. |
| backend/src/seed.rs; backend/src/profiles.rs; backend/src/lib.rs | New additive import validates embedded JSON, uses a single transaction, and records stable provenance keys in two synthetic_* tables. Reuses crate-private profile normalization and existing skill helpers. Repeated imports skip records, preserving edits/archives/contacts/links. SQL stays backend-side. No changes to existing core table columns or user_version. |
| data/synthetic-contractors-v1.json; data/README.md | Generated reusable fictional-crm-v1 dataset: 60 contractors, six organizations/regions, four statuses, six skills, 48 UTC contact dates and 12 never-contacted records. Clearly fictional identities/example emails/reserved phones; no images, credentials, real records or elapsed-day counters. |
| backend/Cargo.toml, backend/Cargo.lock, src-tauri/Cargo.lock | Declared serde_json directly in backend for the JSON dataset; resolved from locally cached crates. Lockfiles updated; no new runtime service. |
| backend/tests/sample_import.rs | Tests repeat import after reopen, preservation of existing manual records and edited/archived samples, no duplicate contacts/skills, and complete rollback for invalid late records or controlled SQL failure. |
| frontend/index.html; frontend/js/sample-data.js; frontend/css/styles.css | Added explicit import confirmation/action/report and Deceased status option. No auto-import/reset. Lock clears/closes/inerts import dialog. Sticky desktop sidebar keeps action reachable beside long directories. |
| scripts/test-desktop-smoke.cjs | Real UI import cancel/60/repeat/restart, edit/archive preservation; observes real filter arguments/results, no-match/clear/stale saved URL, unchanged dashboard totals and status subsets. Simulated filter failure/response ordering is labelled separately. Existing CRUD checks remain; SQLite inspection is read-only. |
| README; data/contract/development/E2E/MVP-checklist docs; personal notes | Records interfaces, provenance/dependency/retention rules, exact evidence, learning, remaining acceptance and next step. |

Checks: 31 backend tests, four bridge tests, and the real-window CRUD/filter/import
smoke passed before the final saved-region-link check. Final result/artifact path
is recorded in session-handoff.md. Backend dependency update tested offline;
locked debug build passed. The earlier sidebar placement issue was resolved and
its viewport reachability is now asserted. Screenshot inspected. Only disposable
test databases were changed; no ordinary app data was imported or reset.

These changes implement the remaining proposed MVP region/data flows, not final
acceptance. Full inactivity/sleep timing, OS-network-disconnected launch, client
scope/timeout agreement, release/fresh-machine packaging, Hope UI alignment and
final macOS/Linux/features still need their own evidence. Contact timestamps and
skills are persisted but their display/decay/skill UI is not connected yet.

Final verification: all 31 backend and four bridge tests passed; locked build
and final real-window smoke passed, including the stale unknown-region URL check.
Artifacts: C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-7Prsqq.
Formatting, syntax, dataset/DOM checks, lock metadata and diff checks passed.
Source is included in this handoff commit. No normal app database touched. MVP evidence
and remaining acceptance are mapped in docs/mvp-checklist.md.

## Full-duration inactivity acceptance — October 30, 2026

Added optional `--idle-only` mode to scripts/test-desktop-smoke.cjs. It runs the
real debug executable for the normal 15-minute interval with a disposable SQLite
database, no clock/timeout overrides, and non-renewing status observations. It
checks lock/hidden/inert state, cleared rows, protected-command rejection,
rejected activity renewal and re-login persistence. Saves JSON timing evidence
and a lock screenshot. Default smoke behavior is unchanged. No teammate
application modules, command contracts, dependencies or production timeouts changed.

docs/e2e-test-plan.md documents the optional run and separate manual sleep/wake
and disconnected-launch steps. Runtime result is recorded in session-handoff.md;
these manual scenarios remain pending until actually observed. JavaScript syntax,
locked debug build and diff checks passed before the timed run. No normal app
database was changed. Changes remain local until explicit commit/push permission.

Result: real-duration run PASSED at 900.38 seconds on October 30, 2026, including
cleared UI, rejected protected read/activity and successful re-login with 60
records. Screenshot reviewed; artifacts retained outside Git at
C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-VD4RYX.
Initial test-script expression error was corrected before the successful run.

## Windows/macOS MVP distribution — October 31, 2026

Broughnut explicitly expanded MVP platforms to Windows and macOS; retained the
seven functional MVP checks rather than silently treating every final feature
as a Sprint 1 requirement. User authorized commit/push of the reviewed changes
on October 31 to continue MVP completion; publication/CI outcomes reported separately.

| Files | Change and reason |
| --- | --- |
| package.json/package-lock.json | Pinned development-only Tauri CLI 2.12.4 and native package commands. Node/npm is not required by end users. |
| src-tauri/tauri.conf.json | Enabled bundling; Windows NSIS with offline WebView2 installer; macOS 13+ universal app/DMG build with ad-hoc signature. macOS 13 avoids relying on older WebKit without the UI's modern APIs. No system-wide security bypass or signing credentials introduced. |
| src-tauri/icon.svg, icons/icon.ico, icon.png, icon.icns | Replaced tiny placeholder icon with generated native icon formats from a reviewable SVG, including Mac ICNS. |
| scripts/desktop.ps1, desktop.sh; .gitattributes | Windows Package helper and Mac test/build/run/package commands, LF shell-script checkouts. Existing Cargo-only development workflow retained. |
| .github/workflows/desktop-builds.yml | Native Windows/Mac runners test and build; Windows debug CRUD smoke and release login launch; Mac architecture/signature checks and ten-second packaged-process check. Uploads artifacts, no public Release or repository write token. Has not run yet. |
| backend/src/session.rs (Josseline's module) | ActivityTime stores Instant plus SystemTime. Both must be fresh; rollback locks, suspend-like wall elapsed expires even when monotonic time excludes sleep. Four meaningful clock-policy unit tests. No SQL/schema/IPC change. |
| frontend/js/security-lock.js (Connor's UI) | Check session on focus/pageshow as well as visibility/polling, so returning to a window rechecks access. No timeout change. |
| frontend/index.html, css/styles.css, vendor/hope-ui/ (Connor's UI) | Actually loads pinned official Hope UI CSS; existing Bootstrap JS/base and rendering retained. Vendor MIT license/loader; remove Google Fonts import/source map for offline packaging; preserve visible keyboard focus. Windows screenshot inspected. |
| src-tauri/src/main.rs | Shadow debug-only test path instead of mutating a release variable; removes release warning without adding a production data-path bypass. |
| scripts/test-desktop-smoke.cjs | Release-launch-only mode checks actual optimized exe login screen without submitting login/data forms. Release uses ordinary app data; all mutation smoke remains debug-isolated. |
| SOW, README, distribution/checklist/development/E2E/IPC/personal docs | Records user-directed platform scope, build/runtime separation, exact evidence, demos, limitations and learning state. |

Checks: 35 backend and four bridge tests passed; locked debug/release builds;
actual Windows NSIS setup generated (~212 MiB including offline WebView2); final
debug CRUD/filter/import/restart smoke passed with Hope UI, zero browser errors,
CSP violations or external HTTP(S). Artifacts: temporary smoke directory 1YKzWK.
Actual release login-screen launch passed; screenshot in temporary directory
VJ3qBK. No login/import/edit forms submitted in release. Bash syntax, JS syntax,
Rust formatting and whitespace checked. Tauri's official NSIS cache rename
failed locally; used a copy of its verified extraction and hash-checked official
plugin, then packaging succeeded. No app workaround or changed installer logic.

Windows SHA256 receipts (local output, not committed binaries):
- release exe: AFA8BED36223DE3A1A55452CE33DA3FFE7E550ECB0BAE4C03679DA077EB2F286
- setup exe: 98279DAFF386D85CAAD633F9BBC0DA8A9EAE569AB7E4A3EFD9D52B789E4D225B

Mac build/launch/UI tests have NOT run. Need native runner/local Mac; downloaded
ad-hoc package approval, full CRUD/offline/sleep acceptance on Mac, plus Windows
installer/fresh-machine/release CRUD/offline/sleep checks remain. No blanket MVP,
security, signing/notarization or cross-platform acceptance claim. The previous
real 900.38-second idle run predates dual-clock logic; deterministic tests are
separate evidence. Ordinary user records were not imported/reset.

Publication/CI follow-up: 8010226 pushed; run 41223485488 cancelled its Mac job
before steps because GitHub is retiring macos-14 (scheduled image brownout).
Changed runner to macos-15, retaining the universal build. Removed only trailing
blank whitespace from vendored Hope CSS after staged diff review flagged it.

Run 41223572908 compiled the actual universal Mac app and DMG after native tests,
then failed our lipo argument order. Corrected workflow command (input first).
Windows compiled but its first CDP page discovery timed out. Added explicit
official WebView2 runtime installation on disposable runner, 60-second initial
discovery, process stdout/stderr logs and failure-artifact upload. Smoke data now
uses RUNNER_TEMP when available so CI diagnostics are retrievable. These are
test/build changes; no production timeout or data-path changes.

Run 41224508852: Mac job succeeded through signature/architecture/process launch
and artifact upload. Windows runtime installed, app created isolated DB, but no
CDP endpoint appeared. Microsoft vendor explanation: elevated hosts ignore
environment-based WebView2 debug arguments (WebView2Feedback issue 5640).
Added explicitly enabled GitHub-hosted-only, exe-scoped HKLM debug arguments,
removed after every test process stop. Refuses an existing app policy; local
runs unchanged. No production security bypass, timeout or command changes.
Reference: https://github.com/MicrosoftEdge/WebView2Feedback/issues/5640.

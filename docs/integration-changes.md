# MVP integration changes

## Laptop requirements, details, security and UI — November 7 (UNVERIFIED)

User authorized development with testing deferred, branch review and visual
polish; supplied laptop requirements, required encryption/recovery, confirmed
name plus phone OR email and reported an oversized logo. All fetched branches
are already contained in dev. No merge, branch switch, commit or push.

- Backend/Josseline files: new details.rs and setup.rs/database.rs implement
  transactional v5 custom JSON and bounded address/secondary-contact persistence.
  profiles.rs saves details within core/inline transactions, shares contact
  validation, normalizes multiline notes and adds organization-region setter.
  search.rs/filtering.rs/decay.rs/skills.rs return the same new fields in all
  Contractor read paths so filtered edits preserve details.
- Backend: new vault.rs plus session.rs/lib.rs implement SQLCipher, random key,
  separate password/recovery wrapping, atomic metadata, process lock, verified
  migration and guarded cleanup. See security-and-recovery.md for boundaries.
- Bridge/Broughnut: commands.rs/main.rs add optional details, new auth/setup
  responses and five recovery/password/cleanup/region commands (22 total).
  Logout/observed expiry closes real DB connection; credentials cleared best
  effort; authentication failures receive bounded in-process cooldowns.
- Frontend/Connor: add-contractor.js sends/reloads details and secondary contacts,
  rejects duplicate/incomplete/reserved custom fields, preserves archived links,
  fixes custom-row initialization order and labels relation selectors. Optional
  role; Basic Details defaults; explicit region editor preserves contractor draft
  and explains that organization region affects all linked contractors.
- phone-input.js adds offline country suggestions and national-number calling
  code normalization when possible; preserves explicit + numbers and empty fields.
- security-lock.js/index.html add key acknowledgement, recovery/password-change
  forms, migration notice/cleanup, Harbor copy, remove Private workspace tag and
  unavailable-logo messages. Correct logo attributes from 1254px to 140/54px.
- theme-init.js/theme-toggle.js/global-ui.js/styles.css unify OS-driven theme,
  add manual Settings modes, bounded auth/logo layout, dark pagination and bottom
  left success toasts (fade/pause/dismiss). Persistent errors remain available.
  contractor-list.js/sample-data.js route notifications; global City labels and
  saved-field country/city filters replace stale unavailable behavior.
- Manifests/lockfiles pin SQLCipher/vendored crypto, AES-GCM, random/zeroize/SHA256/
  locking/tempfile dependencies. .gitignore excludes vault metadata/locks/journals.
  Existing fixture constructors/version assertion updated for details/schema5.

NO compile/tests/build/launch/new visual review or actual migration for this batch.
Rust formatting and dependency resolution are not verification. Earlier 46 backend/
four bridge/Windows smoke passes cover earlier source only. All work uncommitted;
normal user DB untouched. Final checks must adapt Node plaintext SQLite smoke
inspection and setup-key acknowledgement, add new feature/security regressions,
resolve vendored crypto prerequisites (Perl/NASM not on PATH here), and verify
native installations/WCAG 2.2 AA. No security/accessibility/Mac acceptance claim.
Remaining: media, full statuses/history/archive, tags/skills/Soundex, samples,
native actions, portable transfer and final release. Whisper remains deferred.


## Atomic organization and optional contractor — November 7, 2026

Broughnut authorized continuing development. Backend (Josseline-owned)
profiles.rs shares a private contractor insertion helper between standalone
and combined creation. The caller owns one transaction; validation/write/commit
failure prevents partial records. Existing create_organization_profile delegates
with no contractor for compatibility.

Bridge commands.rs adds optional contractor: ProfileFields to OrganizationRequest
and calls the combined operation after the session check. No new command/schema/
dependency. Response stays Organization. Frontend (Connor-owned)
add-contractor.js sends one createOrganization request, removing the second
createContractor call and partial-success path. Errors keep draft/modal for retry.
tauri-api.js documents the field; IPC/inventory/release/continuity docs updated.

Checks: 46 backend/four bridge tests PASS; Windows debug build PASS; JS syntax,
seven UI integrity declarations and diff whitespace PASS. Backend regression and
real-window smoke inject SQLite failure after organization insertion, verify no
partial records, then retry/reopen to verify exactly one linked pair. UI preserves
draft on failure. Full smoke passed; latest artifacts nNgvxO in Windows temp.
Sandbox WebView2 launch timed out; outside-sandbox rerun passed with isolated DB.
No ordinary user DB touched; no Mac/installed-package acceptance. Unsupported
address/secondary-contact/custom/media fields remain pending. Uncommitted.

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

Run 41225451664 confirmed Windows CDP attachment now works. Browser diagnostics
identified Bootstrap CSS/JS SRI failure from Windows checkout newline conversion.
Added `frontend/vendor/** -text` in .gitattributes and early exact-byte integrity
verification in scripts/check-ui-assets.cjs/native CI. Hash checks remain enabled;
vendor runtime content unchanged. This fixes a real fresh-Windows-checkout issue,
not just test timing. Mac bundle from 53e4a66 was downloaded and artifact SHA256
verified; retained under ignored src-tauri/target/distribution/macos-53e4a66.

Final native run 41226249859 for 9c41b187190207b0c808387362958cfd51c32033 PASSED
both jobs: 35 backend/four bridge tests each; exact-byte assets; Windows debug
full UI regression, release exe/NSIS and release login-screen launch; Mac universal
app/DMG, architecture/signature and packaged-process launch. Both platform artifact
downloads matched GitHub SHA256 and were retained under ignored distribution/
directories. Full evidence/links/hashes: docs/mvp-build-evidence.md. CI policy
guard also verified to refuse local/self-hosted use before registry access.
Only evidence/docs change after this build; no new runtime code. Physical Mac UI,
offline/sleep and fresh-machine/release-CRUD acceptance still pending.

## Offline table asset repair — November 5, 2026

Replaced DataTables and IMask CDN references with pinned local assets and added
jQuery 3.7.1 before DataTables 2.3.4. Included upstream MIT licenses, provenance,
and SHA384 integrity values. The asset checker rejects external script and
stylesheet references to catch this regression before desktop launch. No schema,
IPC, or CSP change is required.

Verification: seven local integrity hashes pass and git diff whitespace checks
pass on the latest dev checkout. The identical frontend in the supplied ZIP
built successfully and launched with no browser errors. Its full smoke test
stopped at the stale authentication helper, which does not fill the newly added
confirm-password field; later tests also refer to the previous contractor form.
A full smoke pass is not claimed by this targeted asset repair.

## Repair current Windows smoke regression — November 5, 2026

Updated the desktop smoke runner for setup confirmation, split names, required
role/email/phone, native save confirmations, the organization table, the public
directory refresh API and DataTables pagination. Counts now inspect all DataTables
rows while separate assertions test visible page size and page navigation. Removed
the Alert Level dropdown's inline style in favor of a local CSS class. Retained
backend validation, real saves/restarts, archive, duplicate submission and
simulated stale-response/failure assertions. No backend/schema change.

Local syntax, asset integrity and whitespace checks pass. Windows Application
Control blocks the native build helper (error 4551); native CI outcome must be
checked after publication. No machine policy was changed or ordinary DB opened.

CI follow-up: the updated suite exposed a real region-filter regression: loaded
records bypassed loadFilteredDirectory and filtered only cached arrays. Restored
the existing protected SQLite filter path for directory renders and filter/search
changes, including Alert Level changes. Existing error and stale-response checks
remain enabled. The prior pagination protocol error was fixed by returning no
value from page-changing actions; assertions still verify the resulting page.

## Sample import moved to Settings — November 6, 2026

frontend/index.html now exposes Settings in the sidebar and places the existing
sample-import action in a labeled Settings modal. sample-data.js guards Settings
against unauthenticated opening; existing lock handling closes it. The import
confirmation, authenticated command, repeat-import rules and refresh are unchanged.
Updated scripts/test-desktop-smoke.cjs to open Settings before import and check
Settings remains reachable beside a long directory. No IPC or schema changes.

Verification: JavaScript syntax, seven asset integrity declarations and whitespace
checks passed. Native desktop flow was not rerun. Existing committed merge-conflict
markers in index.html branding were observed and left outside this change.

## Sprint 2 baseline repair and input inventory — November 6, 2026

User authorized starting development after HANDOFF IN at e506cdd. Local changes,
not committed/pushed. Inventory precedes new saved-field or voice implementation.

| Files | What and why |
| --- | --- |
| frontend/index.html (Connor's UI); docs/branding.md | Removed both committed conflict alternatives; retained current-branch compact mark + live Hippo Harbor text, preserving artwork assets. Branding docs reflect the actual chosen markup. |
| backend/src/decay.rs, filtering.rs (Josseline's queries) | Added missing comma after organization_id before new structured-name columns; fixes real SQLite prepare errors in follow-up and region reads. No schema migration or query-filter behavior change. |
| backend/tests/decay.rs, filtering.rs, organization.rs, search.rs, skills.rs | Read-test setups now apply the same initialize_database migrations as the executable; old schemas lacked split-name/status columns. Existing query/archive assertions retained. No missing columns hidden by removing query fields. |
| src-tauri/src/commands.rs | Filled the five new optional-name fields in the existing legacy full_name test helper, restoring test compilation. No production request or command changes. |
| docs/input-contract-inventory.md | Audits 43 static native controls plus generated and planned inputs/actions: types, requiredness, limits, persistence/IPC destination, sensitivity and provisional voice suitability. Records dropped fields, contact-rule mismatch, non-atomic inline creation and missing transfer/media/history contracts. |
| docs/ipc-contract.md | Corrected stale command count (17), supported split-name request/response fields, organization responses/status model, timestamps and current vs intended rules. Existing implementations documented; no new IPC fields introduced by this slice. |
| Release/voice plans and personal notes | Inventory linked, Whisper remains deferred until actual field/model selection; next reliable-save slice and evidence recorded. |

Checks on current local source: all 43 backend and four bridge tests PASS;
locked Windows debug build PASS; full real UI smoke PASS, including authenticated
Settings/sample confirmation/import/repeat and existing CRUD/filter/restart flows.
Seven asset-integrity declarations, marker scan and diff whitespace passed.
Imported-directory screenshot inspected at temporary smoke directory 2POtZa;
disposable DB only, no ordinary records imported/reset. Controlled UI transport
failure tests remain simulations. No new Mac/release-installed acceptance claim.

Still incomplete: structured-name UI payload, phone-or-email/country-aware phone
rules, address/custom/secondary-contact/media persistence and remaining release
plan features. Inventory is not implementation or approval of voice field scope.

## Structured contractor names and phone-or-email — November 6, 2026

Authorized by user continuation; local changes remain uncommitted with the prior
baseline slice. No migrations/dependencies/new commands in this change.

| Files | What changed and why |
| --- | --- |
| backend/src/profiles.rs (Josseline's workflows) | First/last request presence now requires a valid pair even if full_name exists. Contractor create/update require phone or email, validate every supplied value, and accept documented international-format phone syntax instead of arbitrary text. Validation precedes DB writes. |
| frontend/js/add-contractor.js, index.html (Connor's forms) | Send every supported name part; Rust derives full_name. Legacy full names get a dedicated editor and explicit conversion, preserving all words. Preserve existing prefix/suffix values beyond presets. Remove US-only mask; contact alternatives/validation work for standalone and inline contractors. Inline hidden fieldset disabled, required flags limited to actual mandatory controls. Invalid-tab fields are revealed before native validation/focus. Full payload console logging removed. |
| backend/tests/profile_workflows.rs | Added contact alternatives/invalid supplied values/count invariants and rejected-edit preservation, plus structured/legacy name edits, explicit clearing, rejected partial names and reopen checks. Existing SQL rollback tests retained. |
| scripts/test-desktop-smoke.cjs | Form-fill helper dispatches input/change as typing/selecting does. Actual email-only create, international phone-only edit, all name parts after restart, contact errors, legacy-name preservation/conversion and inline email-only restart. Existing CRUD/filter/import/lock coverage retained. |
| IPC/inventory/release/learning/checkpoint docs | Records implemented rules, full replacement semantics, legacy mode and exact verification. National numbering validation, organization contact rules and unrelated persistence remain explicit gaps. |

Checks: 45 backend tests/four bridge tests PASS; locked Windows debug build PASS;
expanded real-window smoke PASS against disposable SQLite, including existing
Settings/sample import and rollback/lock-related regressions. Seven local UI asset
integrity declarations and JS syntax pass. No ordinary DB changes, Mac execution,
release installer or installed-build acceptance claim. Latest temp smoke i7YgHN; legacy editor screenshot inspected.

Phone syntax is an application policy (7–15 ASCII digits, optional leading + with
nonzero next digit, spaces/hyphens/balanced parentheses), not a verified active
number or country-specific numbering-plan check. Inline org+contractor save is
still two calls and can partially commit on a backend failure; atomic save is next.
Address/custom/secondary-contact/media fields remain to integrate. Whisper not
installed or activated; field scope remains pending.

Final preservation review also found existing role values outside UI presets
displayed blank. Editor now retains them as safe temporary select options, with
the same cleanup as custom prefix/suffix values. Smoke saves a legacy record
with a contact-only change and checks exact name, optional name metadata and
original nonpreset role after restart. No role-requiredness change introduced.

### International phone formatting — November 7, 2026

Authorized by Broughnut's request for an international mask. Frontend ownership
edits: index.html replaces the unused US-mask script include with a pinned local
libphonenumber-js bundle and phone-input.js. The new controller formats all four
phone controls from their + calling code, preserves digits, leaves local/invalid
text visible, and handles caret/range edits and separator deletion. Vendor license,
source, SHA512 package verification and shipped SRI are recorded alongside it.
No external runtime requests or Rust/schema/IPC changes. Secondary organization
phone persistence remains pending.

Checks: Windows debug build and full real-window smoke PASS, covering UK/France/
India/US native typing, bulk insertion, middle/range replacement, Backspace/Delete,
local/invalid text, organization/inline controls and formatted phone after restart.
Latest isolated smoke artifacts: rustacean-desktop-smoke-ylDkQj in Windows temp.
JS syntax and seven asset integrity declarations pass. Prior 45 backend/four
bridge test results unchanged; no new Mac/installed-release verification claimed.
# Final verification continuation — November 7, 2026

Frontend changes to Connor's UI: darker light-theme navigation/shortcut text and
warning button colors address actual axe contrast failures; brand link uses its
visible name to avoid an accessible-name mismatch. On lock, global-ui.js clears
DataTables caches and workspace-tools.js clears hidden classification/status/
organization options and history, preventing retained private record text.
No database reset or ordinary user-data migration was performed. Expanded real
native tests are running; full results and platform limitations are maintained
in final-submission-verification.md. Backend/bridge verification: 49 and six
tests respectively passed, including actual encryption and native transcription.

Follow-up scans also drove populated-input, dark heading/table/outline-button and
empty-photo caption contrast fixes. Record-tools scroll regions are keyboard
focusable. Ten focused light/dark scans passed; the full-suite path additionally
exercised the no-photo state. Source formatting was normalized with cargo fmt.
The native workflow shares the Cargo target directory to avoid duplicate crypto
builds and distributes the Windows installer rather than an incomplete loose
executable; the macOS voice binary targets the app's minimum macOS 13 version.

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

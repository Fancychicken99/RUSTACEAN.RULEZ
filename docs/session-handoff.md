# Session handoff

Personal to Broughnut. Updated October 29, 2026.
Branch: dev. Base before this bridge checkpoint: 32a8cd1. User explicitly
authorized committing and pushing the reviewed bridge milestone. This document
is included in that commit; verify origin/dev before retrieving on another device.

## User instructions and learning

Broughnut owns ALL remaining MVP work across frontend/backend/bridge. Do not
leave necessary edits for teammates. Document affected files, changes, reasons,
checks, and limitations in docs/integration-changes.md, and interface changes in
docs/ipc-contract.md. Keep this checkpoint current while working. Commit/push or
HANDOFF OUT only when explicitly requested; prior publication was scoped.

Deliver a runnable native executable. Explain purpose/file placement and Rust
concepts in small steps as they arise. See docs/broughnut-workflow.md and
learning-log.md. Teach-back covered Rust/Cargo, Result, empty/error distinctions,
borrowing, mutex release, registration, and SQL boundaries. Revisit ownership
scope and None versus empty text through actual implementation.

## Scope

User supplied original SOW and authorized revision addressing exaggerated
security/storage/runtime promises. docs/statement-of-work.md is the revised
DRAFT, not client-approved scope. Proposed Sprint 1 MVP: offline Windows
executable; local auth/inactivity; persisted browse/detail/create/edit/archive;
organization association; region filter; useful errors; restart persistence;
50+ synthetic profiles. Final targets remain Windows/macOS/Linux and final
features remain in the SOW. Do not promise a schedule without remaining time.

## Completed and verified

- HANDOFF IN synchronized dev; installed Rust/Cargo 1.99.1 MSVC with existing C++
  Build Tools. All 27 backend tests passed, including after repository moves.
- Reorganized frontend/ (HTML, css/, js/, fixtures/) and renamed Rust directory
  backend-prototype/ to backend/. Package name remains secure_crm_backend.
  Moved reference material under docs/. Updated paths/README and root .gitignore.
- Preserved 50 fixture contractors and five organizations exactly when extracting
  demo-data.js. These are NOT imported SQLite profiles or repeatable seed data.
- Added initial IPC contract and pure JS promise/error wrappers.
- NOW added runnable src-tauri/ project: startup opens app-data crm.db, shared
  state serializes session/database calls, five registered commands provide auth
  status, admin setup, login, logout, and protected contractor retrieval.
- Uses existing backend functions; no Rust backend source changes. Desktop has
  independent Cargo.lock, resolving Tauri 2.12.5 and rusqlite 0.41.1.
- Initial executable loads frontend/integration.html, NOT original index.html.
  Local-only screen verifies setup/login/list/lock without CDN/fixture fallback.
- scripts/desktop.ps1 -Action Test passed (one real bridge workflow).
  Covers setup/reject replacement, wrong/correct login, real record read/reopen,
  logout, failed login relocking, persisted admin and fresh session on reopen.
- scripts/desktop.ps1 -Action Build produced
  src-tauri/target/debug/rustacean_crm.exe (about 14 MB).
- node scripts/test-desktop-smoke.cjs PASSED real UI -> IPC -> backend -> SQLite
  with a fresh temporary database; checks setup, validation, login errors, empty
  list, setup protection, lock, process restart, and persisted password. Captured
  screenshot inspected. Uses built-in Node CDP, not WebDriver or mocked invoke.
- Test artifacts retained at the printed temp path; latest run:
  C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-ihtP0a
- Test launches/processes closed. Normal application data was not used for tests.

## Commands and environment

See docs/desktop-development.md for build/run/test details. From root:
  .\scripts\desktop.ps1 -Action Test
  .\scripts\desktop.ps1 -Action Build
  .\scripts\desktop.ps1 -Action Run
  node scripts/test-desktop-smoke.cjs

Debug-only RUSTACEAN_TEST_DATA_DIR must be absolute and isolates crm.db; release
ignores it. Smoke test sets a localhost WebView2 debugging port only for its own
child. Requires Windows/WebView2 and Node 24 for smoke automation. Dev build is
not an installer or a verified release artifact. Initial Tauri dependency build
needed network-enabled execution; incremental hard-link warning was non-fatal.

## Current limitations and next step

First connection works, full MVP does not yet. Original frontend/index.html still
uses fixture-driven contractor-list.js; add form only logs; security-lock.js has
a hardcoded demo password. CDN CSS/JS and missing images remain in that prototype.
New integration page has real auth/empty results but no CRUD/filter/import yet.
Backend timeout is 15 minutes since authorized backend action; five-second status
polling clears expiry without renewing it. UI activity renewal and actual timeout
timing test remain pending. Network-disconnected launch/release/macOS/Linux not
verified. UI nonempty records not tested; Rust bridge nonempty persistence is.

NEXT: connect Connor's original layout to the real auth/list flow, then add typed
organization/create/update/archive/region-filter commands and wrappers using
existing backend functions. Own any required frontend/backend changes and log
what/why; do not ask teammates to finish them. Define missing field mappings
explicitly (backend full_name, numeric IDs, nullable fields, organization region).
Prepare deterministic synthetic import after schema/contract decisions.

## Work included in this checkpoint

Everything after 32a8cd1: repository moves, .gitignore, README/docs/script path
updates, contract/wrappers, integration log, personal notes, src-tauri source/lock
and icons, integration page assets, desktop runner and smoke test.
The user authorized this scoped commit and push. No branch switch. Build
products/databases are ignored and are not transferred through Git. Rebuild on
another device using the documented setup; machine-installed tools are separate.
Pre-commit readiness review also excluded generated src-tauri/gen/schemas/ files.
Whitespace checks passed; no source changes since the passing executable tests.

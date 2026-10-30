# Rust learning log

Personal to Broughnut. Updated October 29, 2026.
Goal: understand Rust and explain project decisions in the final defense.
Explain purpose/file placement, introduce syntax as it appears, and keep steps
small. Distinguish Rust features from rusqlite, Serde, and Tauri APIs.

## Environment and introduced topics

Rust/Cargo 1.99.1 installed on this Windows device with existing C++ Build Tools.
All 27 locked backend tests passed. Setup/test execution is not user coding practice.
Introduced compiler vs Cargo, version numbers vs edition, Cargo.toml/Cargo.lock,
lib.rs/main.rs/modules/tests, and tracing add_contractor into SQLite.
Also introduced function parameters/return types, Result/?, match, ownership and
borrowing, String/&str, structs/Option, serialization, IPC, managed state,
mutex guards, startup, and command registration. No hands-on exercise completed.

## Teach-back evidence

- Rust/Cargo distinction confirmed at introductory level: user said Rust is the
  language and Cargo the builder; expanded Cargo's dependency/test role.
- Result/? effect understood: user identified preventing false insert success.
- Empty successful list vs failure understood: user selected empty list for zero
  records and login error for failed authentication.
- Borrowing: user confirmed connection remains usable after a borrowed call.
  Initially attributed cleanup to the let line; corrected that cleanup occurs
  when owner leaves scope. Revisit scope and ownership transfer in actual code.
- Option: user said it can be empty; clarified None vs Some(empty String).
  Distinction introduced, not independently confirmed yet.
- Mutex: user correctly said finishing command should release the lock.
- Registration: user correctly said an unregistered command cannot be invoked.
- Layer boundary: user correctly placed SQL in the backend.

## Next learning steps

1. Apply the concepts while defining and implementing the first Tauri command.
2. Revisit ownership moves, scope cleanup, and None vs empty text with examples.
3. Explain managed state, mutex error mapping, and serialization in actual code.
4. Run the connected executable and distinguish backend tests from desktop E2E.

No claim of independent implementation proficiency yet; teach-back confirms only
these introductory concepts. User has asked to proceed toward implementation.

## First implementation slice

Created docs/ipc-contract.md and pure promise wrappers in frontend/js/tauri-api.js. Explained
separation of IPC from rendering, preservation of backend field names, and
explicit distinction between intended commands and registered implementations.
Simulated IPC checks passed; no connected executable exists yet. Frontend wrappers
are implemented but not loaded by pages. Next: Tauri workspace and Rust commands.

## Repository organization

Separated frontend pages/styles/scripts/fixtures from the reusable backend crate.
Crate directory is now backend/; package name secure_crm_backend is unchanged.
Planned src-tauri/ owns startup/commands and will depend on backend/. Reference
code is under docs/reference/. All 27 backend tests passed after the move.
Fixture preservation is not real persisted seed-data integration.

## First real executable bridge

Introduced how src-tauri/main.rs owns startup/shared state and registration,
commands.rs calls existing backend modules, and a page consumes serialized
results. Built the Windows executable and verified real UI/IPC setup/login/list/
lock/restart against isolated SQLite. Original dashboard wiring is still next.
No additional user teach-back or independent coding proficiency confirmed.

## Original layout integration

Applied the bridge to the existing CRM layout instead of the small first screen.
Explained that canonical backend fields are rendered without inferring first/last
names, numeric IDs need string comparison in routes, and loaded record state must
be cleared/invalidated on lock. Added organization/activity commands using existing
backend functions and expiry authorization checks. Local UI assets keep the same
Bootstrap versions; moved inline script/styles for CSP rather than weakening it.
No new user teach-back or independent implementation exercise confirmed.

Verified original CRM screen with actual persisted records and safe literal text,
organizations, numeric-ID profiles/routes, lock clearing and restart. Added a
separate zero-duration backend session test; actual 15-minute timing still untested.
Failure/retry and late responses were simulated frontend conditions; do not present
those as real database failures. Snapshot and detailed checks are in checkpoint.

HANDOFF OUT requested: learning state and next implementation step captured in
session-handoff.md. Resume through actual create/edit/archive code; do not treat
tool-driven test success as proof of independent user coding proficiency.

## Atomic profile save workflow — October 30, 2026

Explained transactions as an all-or-nothing save: name/contact writes commit
together, and a later write failure rolls back the initial insert. Backend
profiles.rs owns those transactions/validation; Tauri commands deserialize typed
requests, check session access, call workflows, and return actual committed
records. organization_id is now serialized so same-name organizations remain
distinct. Edit preserves organization/status; transfers require history-aware
operations. Optional blank values normalize to None/null rather than stale text.

29 backend tests, three bridge tests, and real UI create/edit/archive/restart
checks passed. No new user teach-back or independent coding exercise confirmed.
Resume learning through filter/import code, especially borrowing &mut Connection
for transaction creation and propagating typed domain/database errors.

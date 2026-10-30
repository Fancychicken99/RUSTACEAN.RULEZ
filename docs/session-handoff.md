# Session handoff

Personal to Broughnut. Updated October 30, 2026.
Branch: dev. Base before this milestone: 2e36c00. User explicitly authorized
committing and pushing the reviewed create/edit/archive implementation. This
checkpoint accompanies that commit; verify origin/dev before retrieving it.

## Standing instructions and scope

Broughnut owns ALL remaining MVP work across frontend/backend/bridge. Do not
leave required edits for teammates. Record files/what/why/checks/limitations in
docs/integration-changes.md and update docs/ipc-contract.md for interfaces. Keep
this checkpoint current. Commit/push or HANDOFF OUT only on explicit instruction;
previous authorization was scoped and fulfilled. Explain Rust/file placement in
small steps. See broughnut-workflow.md and learning-log.md; no new teach-back this
slice. Target is a native desktop executable, not just a browser preview.

Revised docs/statement-of-work.md remains a DRAFT, not approved scope/compliance.
Proposed Sprint 1: Windows offline executable; local auth/inactivity; persisted
browse/detail/create/edit/archive; organization association; region filter;
useful errors; restart persistence; 50+ fictional profiles. Final platforms and
other final features remain in SOW. Do not promise timing/compliance without proof.

## HANDOFF IN and baseline

Fetched/pulled clean dev October 30: already current at 2e36c00. Read instructions,
checkpoint and learning log. Rust/Cargo 1.99.1 MSVC, C++ tools, Node 24.22.1 and
Windows/WebView2 work here. Reverified original 27 backend tests, two bridge tests,
debug build and real-window smoke before implementation. No branch switch.

Layout: frontend/ HTML/css/js/vendor/fixtures; backend/ reusable crate
secure_crm_backend; src-tauri/ startup/commands; docs/; scripts/.
Source at 2e36c00 connected original Northstar layout to auth/lists/profiles,
vendored existing Bootstrap assets, and cleared loaded records on lock.

## Current implementation

- NOW connected contractor create/edit/archive and organization creation.
- Added backend/src/profiles.rs for trim/length/control/email/ID validation,
  optional blank -> null normalization, active-organization checks, transactional
  create/update and soft archive. Keeps SQL/persistence in backend modules.
- Contractor responses now include organization_id (nullable for legacy records).
  Updated list/single/search/region/skill/follow-up row maps. No schema migration;
  column already existed. Added get_contractor by ID. Duplicate organization names
  stay distinct in selectors, filters, rosters and counts.
- Eleven registered commands: auth status/setup/login/logout/list contractors/list
  organizations/activity plus create_contractor/update_contractor/archive_contractor/
  create_organization. New typed requests all use {request:...}; deny unknown
  fields, enforce live session, and map database errors safely. See IPC contract.
- Create form uses full_name + active organization ID; role/email/phone optional.
  Edit updates name/contact fields and PRESERVES organization, status, media.
  Organization transfers/status changes need separate audited workflows and are
  not silently performed. Region belongs to organization. Unsupported country/
  city/photo inputs removed from this form rather than discarded on save.
- Fresh DB users can add organizations, then contractors. No fixture fallback or
  auto-seeding. Existing 50 frontend fixtures are NOT imported database records.
- Profile Edit/Archive actions, retained-record confirmation/cancel, useful error
  messages, duplicate-submit guards, save-after-refresh distinction, and dialog
  cleanup/inert/close on lock (including show transitions). Late saves/lists cannot
  reopen locked UI. A transaction already authorized is not cancelled by UI lock.
- Session behavior unchanged: 15-minute frontend/backend inactivity, trusted
  activity renewal at most every 30 seconds, five-second nonrenewing status poll.
  Page reload starts locked. Real timeout/sleep behavior still unverified.
- Local vendor assets/CSP maintained; no remote resources/fixture loader in entry.

## Verification on this device

- ALL 29 backend tests passed (27 baseline plus two new profile workflow tests).
  Covers duplicate-name identity, profile/edit/archive reopen persistence,
  validation, invalid/archived organizations and rollback on second-write failure.
- ALL three desktop bridge tests passed (including new authenticated mutations).
- Locked debug build passed. Non-fatal OneDrive incremental hard-link warnings
  copy files instead; no build/test failure remains.
- FINAL real CRM smoke passed: UI organization+contractor creation, backend field
  validation with preserved input, double-submit protection, edit and process
  restart, organization-ID rosters, safe literal text/numeric profile route,
  auth/lock, open-editor lock clearing, archive cancel/confirm and restart.
- Read-only SQLite inspection after UI archive verifies row/name/archived_at
  retained. No direct SQL seed writes in current smoke. No normal app data touched.
- Simulated UI failure/retry and late-list-response checks remain separately
  labelled; mutation flows use real commands and database writes.
- Zero unexpected browser errors/CSP violations/page overflow/external HTTP(S)
  requests with original CDN hosts blocked. Not OS network-disconnected proof.
- Final directory screenshot inspected. Artifacts retained:
  C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-yoM1zR
  Test child processes closed. First compile's missing skills query field was
  fixed before the passing backend suite. No unresolved check failures.

## Next step

1. Wire the existing backend region filter through a typed command and verify
   filter/no-match/clear behavior through the real UI. Current filters act on
   loaded records, so don't claim backend-filter acceptance yet.
2. Add deterministic reusable synthetic dataset/import under data/ with 50+
   clearly fictional records, varied regions/statuses/contact dates/orgs and
   repeatable nonduplicating behavior. Don't treat prototype elapsed-day fixtures
   or hardcoded image paths as proper seed data. Test repeated import/persistence.
3. Review remaining proposed MVP acceptance: actual inactivity duration,
   OS-disconnected launch, demo/build instructions and requirement evidence.

Organization update/archive; contractor transfer/status/history; contact/skill/
decay UI; media/quick actions; restore UI; formal Hope UI alignment; release/
installer/macOS/Linux verification remain pending final work. Keep ownership
with Broughnut and document required changes; do not defer to teammates.

## Included milestone and commands

Commit scope: backend profile module/tests, database response/getter and query
mappers/lib export; Rust bridge requests/commands/registration/tests; frontend
forms/editor/controller/lock/wrapper; expanded real-window smoke; README and
contract/development/E2E/change-log/learning/checkpoint notes. No new dependencies,
schema migration or branch switch. This scoped commit/push is user-authorized.
Build/data remain ignored and are excluded.

From root:
  .\scripts\test-backend.ps1
  .\scripts\desktop.ps1 -Action Test
  .\scripts\desktop.ps1 -Action Build
  .\scripts\desktop.ps1 -Action Run
  node scripts/test-desktop-smoke.cjs

Executable: src-tauri/target/debug/rustacean_crm.exe. Needs WebView2; not a verified
release installer. Debug-only absolute RUSTACEAN_TEST_DATA_DIR isolates tests;
release ignores override. Node smoke uses localhost CDP only for its own child.
Build output/databases/screenshots/tools do not travel through Git; rebuild and
verify on a receiving device. Check push outcome before relying on remote
availability. Full MVP acceptance is still pending.

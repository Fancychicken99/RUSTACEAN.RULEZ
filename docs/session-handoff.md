# Session handoff

Personal to Broughnut. Updated October 29, 2026.
Branch: dev. HANDOFF OUT explicitly requested. This checkpoint accompanies the
reviewed CRM layout integration commit, based on 89cfcb8. Verify origin/dev
contains this checkpoint before resuming on the other device.

## Standing instructions

Broughnut owns ALL remaining MVP implementation across frontend/backend/bridge.
Do not defer required edits to teammates. Record files, what/why, verification,
and limitations in docs/integration-changes.md; update ipc-contract.md for shared
interfaces. Keep this checkpoint current. Commit/push or HANDOFF OUT only on
explicit request. Previous commit/push authorization was scoped and fulfilled.
Explain file placement and Rust concepts in small steps, with teach-back as useful.
Deliverable is a runnable native executable. See broughnut-workflow.md and
learning-log.md for personal preferences/progress; optional device-workflow.md
only when invoked. No new teach-back in this implementation slice.

## Scope and baseline

User supplied original SOW and authorized correcting exaggerated storage/security/
runtime claims. docs/statement-of-work.md remains a revised DRAFT, not approved
scope. Proposed Sprint 1: offline Windows executable; local auth/inactivity;
persisted browse/detail/create/edit/archive linked to organizations; region
filter; useful errors; restart persistence; 50+ synthetic profiles. Final targets
remain Windows/macOS/Linux. Don't claim full MVP or SOW acceptance yet.

Rust/Cargo 1.99.1 MSVC and existing C++ Build Tools work on this device. Backend
27 tests passed after the previous repository cleanup. Backend source/schema
unchanged this slice. Prior 89cfcb8 contains cleanup, initial five-command Tauri
bridge, earlier integration screen, tests/docs/checkpoint. Source layout:
frontend/ (HTML/css/js/vendor/fixtures), backend/ crate, src-tauri/ native bridge,
docs/, scripts/. Backend package name remains secure_crm_backend.

## Current connected behavior

- src-tauri/ now opens frontend/index.html, the original Northstar CRM layout.
- Added seven-command contract: prior auth status/setup/login/logout/list plus
  list_organizations and record_activity. All registered; organization/activity
  commands require a live session and call existing backend functions.
- Original contractor-list.js now loads real lists on unlock/Refresh. Uses
  full_name/organization_name and numeric IDs correctly, including profile URL
  restoration. Dashboard totals/regions and select options derive from records.
- Fixture data is NOT loaded. The 50 original contractors/five organizations are
  preserved under frontend/fixtures but are not imported database profiles.
  Fresh app DBs therefore show a genuine empty state.
- Setup/login/lock UI replaces hardcoded demo-password logic. Workspace starts
  hidden/inert. Lock clears arrays, tables, profile, search/filter state and route;
  pending response generations are invalidated. Errors show useful messages and
  Refresh allows retry. No fixture fallback or false success.
- Trusted user activity resets a 15-minute UI idle timer and calls record_activity
  at most every 30 seconds. Five-second auth polling never renews a session;
  expired sessions cannot revive. Visibility changes check idle time. Full-duration
  and sleep/wake verification remain pending. Reload relocks the process session.
- Pinned original Bootstrap 5.3.3 and Icons 1.11.3 CSS/JS/fonts are local in vendor/
  with licenses/provenance. CSS/JS match original integrity hashes. Inline theme
  script moved to theme-init.js and inline styles to CSS; CSP not weakened.
- Placeholder totals, trends, and activity removed. Missing country/city/contact
  data and follow-up/history are unavailable, not fabricated. Initials stand in
  for media. Duplicate organization names disable ambiguous roster/count lookups
  because contractor response currently lacks organization_id.
- Create buttons disabled; add-contractor.js is no longer loaded, so its old
  console-only submission is not exposed. Old integration.html and standalone
  profile fragment remain reference/earlier screens, not default entry points.

## Checks performed

- Locked desktop Rust tests: TWO workflows passed. Covers setup/login/logout,
  persisted actual contractor retrieval/reopen, organizations/activity protection,
  and activity failing to revive an expired session (zero-duration test).
- Locked debug executable build passed. Non-fatal incremental-cache hard-link
  warning falls back to copies. Output src-tauri/target/debug/rustacean_crm.exe.
- FINAL node scripts/test-desktop-smoke.cjs PASSED against the actual CRM window:
  setup validation, wrong/correct password, empty list, setup overwrite protection,
  lock, process restart, persisted records/orgs, numeric profile route/reload,
  literal markup-like names, roster, cleared data, and local assets.
- Populated records are inserted directly into a TEST-OWNED SQLite DB for setup;
  this does NOT verify UI create. Failure/retry and delayed response after lock
  are explicitly simulated UI conditions, separate from real IPC verification.
- Test blocks original CDN hosts and observes zero external HTTP(S) requests;
  no unexpected browser errors or CSP violations; no page horizontal overflow.
  This is NOT OS network-disconnected launch evidence.
- All frontend JS parses; index local refs/fonts resolve; no fixture loader,
  remote resource URLs or inline style attributes. cargo fmt/diff checks pass.
- Final screenshot inspected; footer encoding/topbar crowding corrected.
- Retained final test DB/screenshots:
  C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-SHk5dv
  Test processes closed. No normal app DB used/reset. Earlier failed test runs
  retained their temp artifacts; failures were test URL/reload/CSP presentation
  issues and are resolved in the final run.

## Next implementation

Own the next complete create/edit/archive slice:
1. Extend typed IPC contract with organization selection/create and contractor
   create/update/archive/region filtering, using existing backend functions.
2. Align the form with actual stored fields, organization numeric IDs, validation,
   and missing-value behavior. Add organization_id to list contract/backend queries
   if needed; don't infer organization identity from duplicate names.
3. Wire forms/buttons, show completion/errors, refresh saved lists; test create,
   edit, archive and process-restart persistence through the real UI.
4. Add repeatable persisted import for 50+ fictional records (current fixtures
   are not import-ready seed data). Then backend region filter acceptance.
No waiting for Connor/Josseline; log changes to their code and why.

Country/city/media, history/quick actions/final scope, actual timeout duration,
OS-disconnected launch, release/installer builds and macOS/Linux remain pending.
Formal Hope UI alignment is not confirmed by vendored Bootstrap alone.

## Included transfer and resume commands

Changes after 89cfcb8: original HTML/CSS/controller/security-lock/wrapper,
theme-init.js, vendor assets/licenses, Rust commands/main/config, expanded smoke
script, README/development/contract/E2E/change-log docs and personal notes.
This handoff commit contains the reviewed files above. No branch switch.
Generated schemas, executable/build products, databases, and test screenshots
are ignored or outside the checkout and do not travel through Git. Rebuild on
the receiving device; do not copy target/ or application databases.
See docs/desktop-development.md.

From root:
  .\scripts\desktop.ps1 -Action Test
  .\scripts\desktop.ps1 -Action Build
  .\scripts\desktop.ps1 -Action Run
  node scripts/test-desktop-smoke.cjs

Debug-only absolute RUSTACEAN_TEST_DATA_DIR isolates test storage; release ignores
it. Smoke uses Node 24 built-in SQLite/WebSocket and a localhost debugging port
only for its child. The executable needs WebView2. No release installer verified.

## Receiving-device first step

Use HANDOFF IN to safely synchronize dev, reread this checkpoint, and verify Rust,
C++ tools, Node 24, and WebView2 locally. Run the backend checks and desktop build/
tests before calling results locally verified. Existing tests/screenshots above
are evidence from this Windows device only. Then resume the create/edit/archive
slice; the full MVP is not complete. No new work is pending outside this scoped
commit at handoff preparation. Report push success separately; an interrupted
push would mean the receiving device cannot retrieve this checkpoint yet.

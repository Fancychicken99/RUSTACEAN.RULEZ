# Session handoff

Personal to Broughnut. Updated October 31, 2026. Branch: dev.

## Current verified milestone

Broughnut explicitly requires Sprint 1 MVP executables on Windows AND macOS.
Has access to a teammate/professor's Mac; Broughnut owns fixes/implementation.
The SOW's seven functional MVP checks remain; final features remain separate.
User authorized commit/push and continuing MVP completion on October 31.

Release source: 9c41b187190207b0c808387362958cfd51c32033, pushed to origin/dev.
Native workflow 41226249859 PASSED both jobs. See mvp-build-evidence.md for exact
checks, artifact links/hashes and limitations; mvp-distribution.md for demo steps.

Windows: 35 backend + four bridge tests, exact-byte UI integrity, full real debug
CRUD/filter/import/lock/restart smoke, release exe and offline-WebView2 NSIS setup,
and actual release locked-login-screen launch passed on a fresh hosted runner.
Mac: 35 backend + four bridge tests, asset integrity, universal app/DMG build,
arm64/x86_64 verification, ad-hoc signature verification and ten-second packaged
process launch passed on macOS 15. Full Mac UI/hardware acceptance NOT verified.

Verified artifact downloads retained locally (ignored, not transferred via Git):
- src-tauri/target/distribution/windows-9c41b18/rustacean_crm.exe
- src-tauri/target/distribution/windows-9c41b18/bundle/nsis/Rustacean CRM_0.1.0_x64-setup.exe
- src-tauri/target/distribution/macos-9c41b18/Rustacean-CRM-macos-universal.zip
- src-tauri/target/distribution/macos-9c41b18/dmg/Rustacean CRM_0.1.0_universal.dmg
Both outer artifact archive SHA256 values matched GitHub metadata before extraction.
Mac app stays inside metadata-preserving ZIP/DMG when transferring from Windows.
No user database bundled. Windows unsigned; Mac ad-hoc, not notarized; downloaded
Mac demo may need OS approval. Targets Windows 10/11 x64 and macOS 13+ universal;
oldest target OSes are configured, not each independently tested.

## Implementation and remaining acceptance

Published changes: pinned Tauri CLI 2.12.4/package-lock, enabled native bundling,
Windows Package helper/Mac shell commands, CI artifacts, proper ICO/PNG/ICNS from
SVG. Official MIT Hope UI 1.0.3 CSS/loader packaged locally; Google Fonts import
removed, Bootstrap JS/base and application rendering retained. Focus outline
preserved. Exact vendor bytes protected against Windows CRLF conversion by
.gitattributes; early SRI check catches broken UI assets before compilation.

SessionManager now requires monotonic AND wall elapsed within normal 15 minutes;
backward clock anomaly locks. Four deterministic tests cover suspend-like wall
elapsed, monotonic expiry, rollback and status/renewal behavior. Frontend checks
on focus/pageshow too. No IPC/schema changes or production timeout bypass.
Prior real 900.38-second idle pass predates this dual-clock change. Actual OS
sleep/wake still needs testing. Mutation smoke used disposable databases; local
release startup observed ordinary app-data login without submitting data forms.

CI fixes: macOS 14 retired (use macos-15); corrected lipo argument order;
elevated WebView2 ignores environment debug flags, so hosted CI explicitly sets
an exe-scoped HKLM debugging policy and removes it on app stop. Guard refuses
local/self-hosted execution; this was verified locally before registry access.
Production code/local ordinary runs do not modify policy. Diagnostics stay in
RUNNER_TEMP; existing policies are preserved. See integration-changes.md.

Next: actual Mac UI create/edit/archive/filter/import/restart using downloaded
package; actual OS-network-disconnected launch/use and sleep/wake on both OSes;
fresh-machine installer and full release CRUD acceptance. No client acceptance,
security certification, notarization, Intel-hardware execution or Linux claim.
Do not defer required implementation/fixes to teammates. Final scope still adds
organization update/archive, transfers/status/history, skill/contact/decay UI,
media/native actions and restore UI. Teaching stays Python-grounded, short,
during development, no routine quizzes or proficiency inferred from test success.
Update integration-changes/IPC notes when relevant and keep checkpoint current.

## Earlier inactivity checkpoint (October 30)
Latest local continuation after 3541d46: HANDOFF IN fetched/pulled dev clean;
31 backend and four bridge tests passed locally. Added optional real-duration
inactivity smoke and acceptance instructions; these changes are UNCOMMITTED.
Locked debug build and JavaScript syntax/diff checks passed. Real WebView2
`--idle-only` run PASSED at 900.38 seconds (normal 15-minute timeout): hidden/inert
workspace, cleared contractor rows, protected read/activity renewal rejected,
re-login restored access to all 60 saved fictional records. Screenshot reviewed.
Evidence: C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-VD4RYX
(inactivity-result.json, inactivity-lock.png, disposable crm.db). Ordinary app data
untouched; test process closed. No production code/timeout/interface changes.
Next: actual OS sleep/wake and OS-network-disconnected launch acceptance checks;
procedures in e2e-test-plan.md. No such result claimed yet. Earlier milestone
details below are historical; full-duration awake inactivity is now verified.

Branch: dev. Published milestone: 3541d46, region-filter/sample-import work after
3c027d8. Current acceptance-test continuation is local and not yet published.
Verify origin/dev and working-tree state before relying on another device.

## Standing instructions and learning workflow

Broughnut owns ALL remaining MVP work across frontend/backend/bridge. Do not
leave necessary implementation for teammates. Log affected files, what/why,
checks and limitations in docs/integration-changes.md, interfaces in ipc-contract.
Keep this checkpoint current. Commit/push or HANDOFF OUT only on explicit request;
prior publication authorization was scoped and fulfilled.

User is comfortable with Python, new to Rust. Learn DURING development and review
deeper afterward: short goal/files/concept preview, complete working slice, tests,
focused excerpt/Python comparison, continuity updates. NO routine quizzes or
comprehension checks; don't make learning an approval gate. Full-file Rust dumps
were overwhelming. Main.rs reviewed through setup; Option/HashMap introduced in
this slice. No independent coding exercise or advanced proficiency confirmed.
See broughnut-workflow.md and learning-log.md for the recorded agreement.

## Scope and environment

Revised statement-of-work.md is a DRAFT, not client-approved scope/compliance.
Proposed Sprint 1: runnable offline Windows executable; local auth/inactivity;
persisted browse/create/edit/archive; organization association; region filtering;
useful errors; restart persistence; 50+ fictional profiles. See mvp-checklist.md
for actual evidence versus remaining acceptance. Final SOW platforms/features
remain separate; do not claim complete MVP/security/platform acceptance yet.

Rust/Cargo 1.99.1 MSVC, C++ Build Tools, Node 24.22.1, Windows/WebView2 verified
here. HANDOFF IN earlier today fetched/pulled clean dev at 2e36c00, then the
create/edit/archive milestone was committed/pushed as 3c027d8.

Layout: frontend/ HTML/css/js/vendor; backend/ secure_crm_backend library;
src-tauri/ native startup/state/commands; data/ reusable JSON samples; docs/;
scripts/. Initial 50 JS fixture records remain unused; no fixture fallback.

## Current application behavior

- Original Northstar layout is the default native window, with real local
  password setup/login/lock, lists, profiles, organization creation and contractor
  create/edit/archive. Edits cover full_name, role, email, phone; preserve org,
  status and media. Organization/status transfers need separate audited flows.
- Atomic backend profile workflows validate inputs and safe IDs. Archive hides
  but retains rows/status. organization_id is included consistently in query
  results, rosters/filters/forms use IDs even for duplicate names.
- NOW region dropdown changes AND clear invoke filter_contractors in Rust, calling
  existing search_contractors SQLite query. Null/blank = all; trimmed/case-insensitive
  exact region match; unknown region = successful empty list. Saved unknown-region
  URLs remain actual queries, not silent All fallbacks.
- Full-list cache stays separate for global dashboard totals and profiles. Local
  organization/status/search filters narrow SQL region results. Separate request
  generations discard old/out-of-order/locked responses. Loading, no-match and
  error states are distinct; failed filter never shows cached rows as success.
- NOW explicit Import fictional samples action with confirmation imports the
  embedded data/synthetic-contractors-v1.json. No automatic startup import/reset.
- Dataset fictional-crm-v1 (as of 2026-10-30): 60 fictional contractors, six
  organizations/regions, four statuses, six skills, 48 stored UTC contact dates,
  12 never-contacted. example.com emails, fictional reserved phones, no media,
  credentials or real contractor records. Dates persist; elapsed days aren't stored.
- Backend seed.rs validates JSON/profile/keys/references/status/dates and imports
  all in one transaction. Two additive synthetic_* provenance tables map stable
  dataset/key pairs to DB IDs. Repeats skip mapped records, preserve edits/archives,
  don't duplicate contacts/links and don't merge manual records by name/email.
  Existing skill dictionary names may be reused. No core table/user_version change.
- Thirteen registered commands: prior 11 plus filter_contractors and
  import_sample_data. Both authenticated, all frontend calls in tauri-api.js.
  Import has no arbitrary file/path/JSON IPC input; Rust embeds the fixed dataset.
- Declared serde_json directly in backend for JSON parsing; both Cargo lockfiles
  updated from cached crates. It was already in the desktop dependency graph.
- Sample dialog follows mutation lock/busy/clear rules. Desktop sidebar sticks
  in view so navigation/import remains reachable beside the 60-row directory.
- Existing local Bootstrap/CSP maintained. Missing media/history/contact fields
  remain visibly unavailable; imported dates/skills are stored but not yet wired
  to contact/skill/decay UI. Country/city inputs still unsupported.

## Checks passed on this device

- 31 backend tests (29 previous + two sample import tests): repeat/reopen preserves
  manual records, edits/archives, contacts/skills; bad late record and controlled
  SQL failure roll back ALL import writes. Database error details stay private.
- Four bridge tests (three previous + filter/import protection/repeat/region/
  archive-exclusion). Backend/bridge dependency updates tested offline. Both
  manifests subsequently verified against lockfiles with --locked --offline.
- Locked debug executable build passed. Non-fatal incremental hard-link warning
  copies cache files; no unresolved build/test failures.
- FINAL real-window smoke PASSED against disposable SQLite: prior setup/login/
  CRUD/edit/archive/restart flows plus import cancel/import/repeat/restart,
  preservation of edited/archived sample, 60 rows initially and 59 after archiving
  one sample, match/no-match/clear/stale saved region URL and full dashboard totals.
- Region arguments/raw results observed while calling real backend; remaining
  status filter verified. Filter failure/retry and delayed region response ordering
  are explicitly simulated UI transport conditions, separate from real SQL flows.
- UI action reachable in viewport on a long directory. No unexpected browser
  errors/CSP violations or external HTTP(S) requests with original CDN hosts
  blocked. This does NOT prove launch with OS networking disabled.
- Source syntax/static IDs/dataset fictional identity checks, Rust formatting,
  whitespace checks and lockfile metadata checks passed. Imported screenshot
  inspected (sticky sidebar/import button included).
- Latest final artifacts (not transferred through Git):
  C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-7Prsqq
  Read-only SQLite inspection confirms provenance/contact counts and retained
  edited/archived sample. No normal application database was imported or reset.
  All test child processes closed.

## Next step toward MVP acceptance

Core proposed MVP data flows are now implemented and tested. Before calling the
MVP accepted, verify sleep/wake behavior; launch
with OS networking disconnected; manually review client demo scenarios; document
build/runtime prerequisites and agreed scope/timeout. See mvp-checklist.md.
Consider targeted testability for timeout only if needed, without production
bypasses or claiming accelerated tests prove full-duration behavior.

Remaining final-scope implementation: organization update/archive; contractor
transfer/status/history; contact/skill/decay UI/commands; media/native quick actions;
restore UI; formal Hope UI alignment; release/installer/fresh-machine and macOS/
Linux verification. User owns this work; don't defer to teammates. No automatic
publish or handoff. Learning review next can use a short Option-to-filter call
or stable-key lookup with Python comparisons, no quiz.

## Included handoff and run commands

README; backend manifest/lock/module export and crate-private validator access;
new seed module/tests; data JSON/notes; Rust commands/main and desktop lock;
frontend directory/filter/import markup/module/sidebar style/wrappers; expanded
smoke; workflow/learning/checkpoint and contract/development/E2E/change-log/MVP
checklist docs. User authorized committing and pushing this reviewed scope.
No branch switch; build output and application/test data are excluded.

From repository root:
  .\scripts\test-backend.ps1
  .\scripts\desktop.ps1 -Action Test
  .\scripts\desktop.ps1 -Action Build
  .\scripts\desktop.ps1 -Action Run
  node scripts/test-desktop-smoke.cjs

Executable: src-tauri/target/debug/rustacean_crm.exe. Requires Windows WebView2;
no release installer verified. Debug-only absolute RUSTACEAN_TEST_DATA_DIR isolates
smoke storage, release ignores it. Node smoke uses localhost CDP for its own child.
Generated schemas/build outputs/databases remain ignored. Rebuild and verify on
another device rather than copying target/ or ordinary application data.

## Receiving-device resume

Use HANDOFF IN to safely synchronize dev and reread this checkpoint and learning
workflow. Verify toolchain/WebView2/Node locally, rebuild and run the documented
checks before treating this device's results as locally verified. Do not copy
Cargo target/ or ordinary app databases to synchronize devices. This commit
contains the source/dataset/docs; tools, executable and temporary screenshots
do not travel through Git. Next is MVP acceptance evidence, not recreating the
completed data flows. Wait for the user before substantial development. Push
outcome is reported separately; a failed push would block retrieval elsewhere.

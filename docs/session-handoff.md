# Session handoff

## Download update complete — November 9, 2026

User authorized updating homepage downloads to the newest code. HEAD 474a90d had
committed merge markers across 15 live files; native run 42564003274 failed on both
platforms. Reconciled overlap without dropping newer archives/history/closure UI.
0.2.1 uses schema 7 with tested schema-6 upgrades and portable 6/7 imports.
Local: 50 backend tests, six bridge/voice tests and full Windows regression passed;
focused history/company closure/archive/restart scans also passed (smoke-jv6Yog).
Fast conflict-marker guard and explicit successful-run release publisher added.
Repaired source 6c9e6d8 is pushed. Native build 42662290005 SUCCEEDED on Windows
and Mac, including packages and startup checks. Publisher 42668101875 SUCCEEDED
and published v0.2.1 from those exact artifacts after digest/size verification.
Default main README commit 25834af now uses latest-release stable installer links;
dev README matches. Both public download URLs verified HTTP 200. INSTALL.md and
SHA256SUMS.txt included. v0.2.0 retained as older release. Main publisher workflow
was installed in e6810e4; manually dispatch it for future successful exact-source
native runs. No branch switch or app-source merge into main. User authorization
includes necessary commit/push/publication for this download update. No ordinary
user workspace migrated or reset. Manual acceptance/signing limits still apply.

## Public download publication — November 7, 2026

User explicitly authorized a GitHub Release and homepage download buttons.
v0.2.0 is published at https://github.com/Fancychicken99/RUSTACEAN.RULEZ/releases/tag/v0.2.0
with both installers, INSTALL.md and SHA256SUMS.txt. Default main README updated
in commit 337d0e4 with direct Windows/Mac download badges. Development README
also contains those links. No branch switch or source merge. Public HTTP 200,
asset hashes/sizes, badge SVG responses and latest-release/default-homepage links
were verified. Both native jobs in run 42373955371 succeeded. See
final-submission-verification.md for evidence and remaining manual acceptance.

## Latest continuation — November 7, 2026

Full final Sprint 2 scope remains active, not MVP. Source and installer delivery
notes are published on dev. User authorized completing both installers, including publishing the reviewed source to trigger native builds. All 49 backend and six bridge/
voice tests passed, including real SQLCipher transfer/recovery and native offline
transcription. Full real-WebView2 suite now PASSED, including CRUD/import/restart,
international masking, new media/taxonomy persistence and fake-device dictation
review. Ten light/dark axe scans passed after actual contrast/name/scroll fixes;
this does not establish complete manual WCAG acceptance. Final artifact directory:
C:\Users\Brody Mensonides\AppData\Local\Temp\rustacean-desktop-smoke-QCQXdq.
Windows release startup PASSED without login/data changes; final NSIS build PASSED.
Installer: src-tauri/target/release/bundle/nsis/Hippo Harbor CRM_0.2.0_x64-setup.exe,
355,313,350 bytes; checksum recorded in final-submission-verification.md.
User authorized installer completion; source 4cf8cec is pushed to dev. Native
Windows/Mac run 42373955371: Mac job SUCCEEDED, including backend/bridge tests,
actual Whisper transcription, universal app/DMG, architecture/signature checks and
packaged process launch. Mac artifact 13575700414 downloaded and digest verified.
Both local installers are in src-tauri/target/installers/ with INSTALL.md and
SHA256SUMS.txt. Windows CI also SUCCEEDED: backend/bridge/full UI, release packaging
and release startup passed. Local Windows installer/release checks passed. No full
Mac UI acceptance yet; app is ad-hoc signed, not Developer ID notarized.
Installer/fresh-device/physical mic/native picker
and manual accessibility checks remain explicit.
Latest source also clears hidden record tools and DataTables caches on lock.
See final-submission-verification.md for acceptance boundaries. Older sections
below are historical, including references to pending tests or MVP scope.

## ACTIVE final Sprint 2 submission — November 7, 2026

User explicitly corrected scope: MVP already demoed; FULL Sprint 2 checklist is
required by morning. Continue autonomously, no teammate deferrals. Testing is now
the final verification phase. No commit/push authorization yet. Current dev dirty
work preserved; source version bumped to 0.2.0, no new installer built yet.

Resume point after usage interruption: portable Strawberry Perl (checksum pinned,
no global install) under ignored src-tauri/target/build-tools now builds vendored
crypto. Earlier expanded backend (46 tests) and four bridge tests passed with
SQLCipher. New final_workflows suite: all THREE passed, including actual cipher
unreadability without key, recovery/rotation, encrypted export/import with media,
cancel/wrong-password preservation, plaintext migration/confirmed cleanup, and
SQL combined Soundex/taxonomy/history/archive/reopen. Key PRAGMA returned status
rows in SQLCipher; fixed by safe internal-hex execute_batch instead of pragma_update.

NEW source since previous checkpoint: workspace.rs schema v6 (audit triggers,
record_media), real combined SQL query; classifications/history/archive/restore/
transfer/org-status UI; media validation and atomic DB-linked local image copies;
password-encrypted portable snapshots and native picker/preview/backup import;
native tel/sms/Teams handoff; full name/contact/details sample data with four
archived samples and synthetic generated images, labels without Fictional.

Offline voice implementation now added for free-text profile/name/address/notes/
custom fields (credentials, contact numbers/emails, country/region/selectors
excluded). Multilingual base model, 120s capture, canonical WAV, explicit reviewed
insert, cancellation/lock handling. Official Whisper 1.8.2 Windows CPU runtime
and base model downloaded/checksummed, resources pruned to CLI+needed DLLs.
Build-time prepare-voice.cjs and pinned manifest also build macOS universal CLI;
Mac microphone plist/entitlements added. Resources are ignored/generated, MUST
run npm run prepare:voice before build/tests/package. No runtime downloads.

IN PROGRESS: full backend suite (log src-tauri/target/final-backend-tests.log,
exec session 84750 when still available). New source after prior passes needs
latest compilation and bridge tests, including actual CLI sample speech test.
Need fix any baseline counts for 56 active/60 total samples; old sample rollback
fixture now file-backed for media. Smoke harness has been adapted away from plain
Node SQLite to authenticated archive snapshot; recovery-key acknowledgement added;
new searchRecords path and sample counts updated, but not run yet. Add coverage
for new UI features and accessibility, inspect logo/themes. Native Windows release/
installer and current Mac CI artifacts still required. Need permission to commit/
push reviewed final work to trigger native CI after concrete build/tests ready.

TODO finish: latest compile/test fixes, rich workflow UI smoke, sample/docs review,
WCAG automated/manual checks, release packaging, submission evidence/slides/SOW
mapping. Mac/Linux support must be stated from actual evidence, no false acceptance
claim. Windows environment script prepare-windows-build.ps1 added for reproducible
Perl provisioning; CI stages voice/resources before tests. All work uncommitted.

## Current development batch — November 7, 2026 (UNVERIFIED)

User asked to continue development and defer testing to the end to save usage.
NO tests, builds, executable launches or migrations of ordinary user data were
run for this batch. Earlier 46 backend/four bridge/Windows smoke results below
cover earlier source only. Formatting and Cargo dependency resolution are not
verification. Latest executable on disk predates these changes. All work remains
LOCAL UNCOMMITTED on dev; no commit/push authorization.

Fetched all branches November 7: origin/dev unchanged at e506cdd; origin/main,
origin/josseline-backend and origin/codex/fix-offline-table-assets are ancestors
of dev, no unmerged commits. No branch switch/merge performed. Separate laptop
chat unavailable; user then pasted its requirements. Saved reconciled checklist
in sprint2-user-requirements.md. CONFIRMED user chose name plus phone OR email;
role and other optional fields can be blank. Retain organization association.

Source changes in this batch:
- Optional RecordDetails / OrganizationDetails, schema v5 JSON-object custom
  columns; address/secondary-contact/custom-field saves in existing transactions.
  Typed text/long_text/relation fields with limits, duplicate checks, target checks
  and preserved archived IDs; complete detail responses across query paths.
- Organization notes support normalized multiline text; create/update main phone
  share contractor syntax. New set_organization_region command/UI in contractor
  editor saves selected organization's region, with explicit organization-wide
  explanation and retained contractor draft. Country/city saved-field UI filters
  enabled; global City wording replaces City/Sector, legacy IDs retained.
- SQLCipher vault, random key wrapped independently by password/recovery key;
  Argon2id/AES-GCM, atomic manifest, exclusive process lock. New setup one-time
  key panel, recovery/password-change forms and migration cleanup notice/action.
  Locked/expired sessions close the real connection. Existing plaintext migrates
  after correct login, compares counts/checks integrity, preserves source until
  explicit verified cleanup. Missing/corrupt metadata fails closed. See
  security-and-recovery.md for design/boundaries and recovery limitations.
- 22 commands now: original 17 plus take_recovery_key, recover_password,
  change_password, remove_original_database, set_organization_region.
- System-theme default/live listener plus Settings system/light/dark choice;
  removed competing clock logic. Dark pagination styles. Success notification
  bottom-left auto-fades; errors persist, dismiss/pause-on-hover/focus supported.
- Harbor auth copy/appearance, Private workspace tag removed, logo dimensions
  fixed in HTML (login 140px/sidebar54px) and bounded CSS to address user's
  oversized/cropped executable logo report. New/edit forms open Basic Details.
  Removed unavailable-logo help. No visual verification claimed yet.
- Country suggestions use existing offline phone metadata: recognized country
  formats local input and adds calling code when possible; + numbers keep their
  own calling code, country changes do not rewrite saved + numbers. Incomplete
  local input stays local; no extra contact required by choosing a country.

Dependencies/locks updated for SQLCipher/vendored crypto, AES-GCM, randomness,
zeroize, SHA-256, fs2 and production tempfile. Perl/NASM not found on PATH;
resolve build prerequisites in final build phase, not an established compile
failure. No packages installed. Cargo metadata resolution outside sandbox passed.

NEXT: continue unchecked development from the reconciled checklist (media,
statuses/history/archive/restore, skills/tags/Soundex and combined filters,
native contact actions, full sample dataset and portable export/import). Whisper
still explicitly deferred for field/language/model selection. At final testing
phase adapt desktop smoke: recovery acknowledgement and encrypted DB mean its
old direct Node SQLite crm.db inspection no longer applies. Add security/details/
region/country/theme/toast/visual regression coverage, compile, then real native
Windows/macOS acceptance, WCAG 2.2 AA evaluation and installations. Do not mark
the whole product done or claim cryptographic/accessibility compliance.

## Current atomic organization save — November 7, 2026

LOCAL UNCOMMITTED on dev; preceding baseline/name/contact/mask work preserved.
create_organization now accepts optional contractor: ProfileFields or null.
Backend inserts organization plus optional contractor in one transaction, reusing
the contractor insertion helper. Existing response and 17 commands unchanged.
UI makes one request; failed save keeps the modal/draft open. Organization edit
unchanged. Removed partial-success handling.

Verified 46 backend tests/four bridge tests PASS; locked Windows debug build PASS;
JS syntax, seven asset integrity declarations and diff whitespace PASS. Expanded
full executable smoke PASS: injected SQLite failure after organization insert
rolls back both records, retains draft, retry produces exactly one linked pair
after restart; existing name/contact/mask/CRUD/filter/import/lock checks pass.
Sandbox launch could not connect to WebView2; outside-sandbox rerun passed.
Only isolated test DB used. Latest artifacts:
C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-nNgvxO.
No Mac/installed-package acceptance claimed. No commit/push performed.

Next: address/secondary-contact/custom-field persistence with explicit limits;
those inputs remain unwired, including secondary organization phone. Whisper
remains deferred. Teach briefly with Python comparisons, without quizzes.

## Current international phone mask — November 7, 2026

LOCAL UNCOMMITTED on dev, including preceding baseline and name/contact slices.
Added offline libphonenumber-js 1.13.15 formatting to all four phone inputs via
frontend/js/phone-input.js. A leading + selects international formatting; local
numbers without + remain unchanged. Invalid text remains visible for validation.
No Rust, schema or IPC changes. Secondary organization phone persistence remains
pending; formatting that draft field does not save it.

Windows debug build and full real-window smoke PASS: UK/France/India/US native
typing, bulk insertion, middle/range replacement, Backspace/Delete, local/invalid
text, organization/inline fields, and contractor formatting after restart.
Latest artifacts: C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-ylDkQj.
JS syntax and seven local asset integrity declarations pass. Prior Rust results
remain 45 backend/four bridge tests; Rust unchanged in this slice. No Mac or
installed-release acceptance claimed. No commit/push authorization for this work.

## Current name/contact slice — November 6, 2026

User said continue. LOCAL UNCOMMITTED on dev after e506cdd, including preceding
baseline/inventory repairs. No new commit/push authorization.

Implemented: all five contractor name parts now sent through existing ProfileFields
and saved. Rust derives full_name, rejects partially/blank supplied first/last
even if fallback full_name is supplied. Legacy name-only records get one full-name
editor; no token guessing or lost middle names. Explicit conversion clears/shows
separate parts and requires first/last. Existing prefix/suffix outside presets are
retained in the editor and cleared from loaded options on lock. Existing role
values outside presets are retained too, preventing a contact-only edit from
forcing an unrelated role change. Legacy optional name metadata is preserved.

Contractor create/update require phone OR email; both allowed and each supplied
value validated. Standalone and inline UI enforce this; forced US mask removed.
Basic phone policy: 7–15 ASCII digits, optional leading + followed by nonzero digit,
spaces/hyphens/balanced nonnested parentheses; outer trim, formatting retained.
Not active-number or country-specific validation; geography remains unwired.
Organization contact requirement is not changed. Inline name parts now persist,
but organization+inline creation still uses two calls and is NOT atomic yet.

Form validation reveals the invalid field's tab, then uses native validity/focus;
forms suppress automatic validation so hidden-tab fields can be revealed first.
Collapsed inline fields disabled; stale custom validity cleared on input/reset/lock.
Removed complete prototype payload console logs. Address/custom/media prototype
fields still dropped until their full persistence slices. No schema/dependencies
or new IPC commands introduced. Omitted/null optional JSON both deserialize None;
these are full replacement profile saves, not partial patch semantics.

Verified: 45 backend tests, four bridge tests, locked Windows debug build, seven
asset checks, JS syntax, diff whitespace and expanded real executable smoke PASS.
Real UI: email-only create; international phone-only edit; prefix/middle/suffix
restart; missing/invalid contact rejection; exact legacy-name edit/restart and
explicit conversion; inline email-only contractor persists after restart. Existing
CRUD/filter/sample/lock/failure-generation regression remains covered (controlled
transport failures are labelled simulations). Latest isolated artifacts:
C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-i7YgHN.
Ordinary user DB untouched. No current Mac or installed-release acceptance run.

Updated IPC contract, inventory and release plan; Whisper remains deferred pending
field/language/model selection. Next: atomic org+inline transaction and remaining
address/secondary-contact/custom-field persistence with clear limits/contracts.
Do not defer implementation to teammates or infer learning proficiency from tests.

## Current local development — November 6, 2026

HANDOFF IN synchronized clean dev at e506cdd; user then authorized starting work.
LOCAL UNCOMMITTED baseline/inventory slice supersedes the earlier defect status:
- Removed two committed branding conflict sections, retaining current-branch
  compact Hippo Harbor mark plus visible text; approved artwork files preserved.
- Fixed missing SELECT commas in decay.rs and filtering.rs. Added five optional
  name fields to the bridge's legacy-name test initializer.
- Updated decay/filtering/organization/search/skill read-test fixtures to use
  initialize_database (real app migrations), preserving behavior assertions.
- Added input-contract-inventory.md: all 43 static controls plus generated/planned
  controls/actions, current vs intended validation, persistence gaps, sensitivity
  and provisional voice suitability. Updated IPC docs to 17 commands, structured
  name fields and real organization responses; no wire contract changed today.
- Linked inventory from release/voice plans. Whisper field/language/model scope
  remains unselected; engine/model/recording implementation still deferred.

Verified HERE on November 6: 43 backend tests and four bridge tests PASS; locked
Windows debug build PASS; full real-window smoke PASS including Settings-based
sample import, CRUD/filter/import/restart and existing error/lock checks. Seven
UI integrity declarations and diff whitespace pass. Screenshot reviewed:
C:\Users\BRODYM~1\AppData\Local\Temp\rustacean-desktop-smoke-2POtZa
(imported-directory.png plus isolated database). Normal app data untouched.
Simulated transport failures remain labelled separately in smoke output. Existing
OneDrive hard-link cache warnings fall back to copies; no unresolved test failure.
No latest release installer, Mac UI or installed-package acceptance rerun.

Next complete slice: wire stored split-name fields without guessing legacy names;
enforce phone OR email at both boundaries, validating each supplied value and
removing forced US-only/both-required behavior. Then extend reliable org/address/
custom-field saves atomically. Do not confuse inventory with implementation:
address/media/custom inputs are still dropped, org status UI/read-history/fuzzy
IPC and portable import/export remain gaps. Decisions about other required fields,
recovery/import conflicts/encryption and voice selection remain pending.
Explain Rust using short Python comparisons while developing, no routine quizzes.
No commit/push authorization for this new slice; prior publication was scoped.

## Latest checkpoint — November 6, 2026

Broughnut explicitly requested HANDOFF OUT to continue on the desktop. Branch:
`dev`; base for this session's changes is c172964. This section supersedes older
checkpoint status below. The commit containing this section carries all pending
session files; verify remote synchronization rather than relying on old hashes.

Delivered in this handoff:
- docs/sprint2-release-plan.md: source audit and ordered whole-product release
  plan for downloadable Windows setup exe/macOS app+DMG. Broughnut owns all
  remaining work. Existing UI/backend features are partial until integrated and
  verified; this was planning, not broad feature implementation.
- Added required portable data import/export (records, relationships, archived
  records, notes/history, tags/skills, photos/logos). Choose merge versus workspace
  restore and encryption/credential handling before implementation. Sample import
  and developer Git handoff are separate features.
- Sample-data import moved from sidebar into Settings. Confirmation, authentication,
  duplicate-safe import and refresh behavior retained. Updated smoke runner to
  navigate Settings; added authenticated Settings modal guard. Files: frontend/
  index.html, frontend/js/sample-data.js, scripts/test-desktop-smoke.cjs.
- Recorded the change in docs/integration-changes.md. No IPC/schema changes.

Confirmed requirements: phone OR email (both allowed, neither rejected); supplied
values validated; color-coded accessible tags; retired/deceased last in default
order with explicit sorting overriding; system theme; local Whisper voice input.
Whisper remains deferred until full input inventory and dictation field selection.
Do not install an engine/model or assume notes-only scope before that step.

Checks: JavaScript syntax, seven local UI asset integrity declarations and diff
whitespace passed for this change. No current full backend/native desktop suite,
Settings UI smoke, or installed-release acceptance was rerun. Earlier tests/build
claims below refer to earlier sources and are not verification of this handoff.

Known pre-existing defect: frontend/index.html already contains committed conflict
markers in two branding sections at c172964. These were NOT introduced or resolved
by the Settings change. This handoff transfers development work, not a release-ready
build; resolve those sections before native visual acceptance/release. Also note
existing incomplete media handoff, stale IPC docs, dropped extended form fields,
US-only phone masking, absent general import/export and absent Whisper runtime.

Next: HANDOFF IN on desktop; read docs/broughnut-workflow.md, this section and the
release plan. Verify actual branch/status and local tooling. Start with the input/
contract inventory and resolve branding conflict markup, then implement complete
small slices in plan order with Python-grounded Rust explanations. Do not defer
required fixes to teammates, assume test results imply Rust proficiency, offer
handoffs automatically, or publish without new authorization.

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

# Rust learning log

## GitHub download delivery — November 7, 2026

Release assets are versioned installer files; source ZIPs are different and do not
contain the built installer. Repository homepage buttons link directly to the
release assets. The default main README and development README are separate files
on separate branches, so both need the download links. This publication work does
not change Rust behavior or establish additional coding proficiency.

## Native installer delivery — November 7, 2026

Windows executables and macOS executable app bundles must be packaged on their
native platforms. A Mac DMG is the delivery container; the .app inside is copied
to Applications. Bundled speech resources are required beside the Windows binary
and inside the Mac bundle, so a loose .exe is not the full distributable. Native
build/signature/architecture checks differ from installation and microphone/UI
acceptance. No new user coding practice or independent proficiency was assessed.

## Final verification — November 7, 2026

Continued development without a quiz or new user coding exercise. Backend tests,
actual offline engine transcription, executable UI and installer/Mac acceptance
are separate evidence boundaries. Actual accessibility scans found contrast and
visible-name issues; frontend fixes are under native recheck. No independent
Rust proficiency is inferred from agent-written implementation or passing tests.

## November 7 development batch — testing deferred by user

Continued typed optional details and atomic persistence. Explained structures
as an approximate counterpart to Python dataclasses: shape and validation are
separate concerns. Optional groups distinguish preserve (None) from replacing
the details object (Some); empty fields in that object clear stored values.

Encryption/recovery introduced a random database key protected by separate
password/recovery wrappers; a password hash is not database encryption. Session
cleanup closes the actual connection, not just the visible workspace. Discussed
safe migration retaining source until verified cleanup, and explicit responsive
image dimensions instead of relying on native raster size. No exercises/quizzes
or demonstrated independent proficiency. No tests/builds run for this batch.

## Atomic organization and inline contractor — November 7, 2026

Introduced SQLite transactions through rusqlite: commit makes both records final;
an early error drops the transaction and rolls back its writes. Python comparison:
a database transaction context that rolls back when an exception escapes.
Rust's ? propagates an error; rollback comes from the transaction's cleanup, not
from ? itself. Reused one insertion helper under either caller's transaction.
Option<ProfileFields> means an inline contractor may be absent; map(...).transpose()
validates it if present and propagates validation errors. These are concepts
introduced during agent implementation, not demonstrated independent proficiency.

## International phone formatting — November 7, 2026

Added an offline JavaScript formatter while keeping Rust contact validation as
the save boundary. Formatting makes input easier to read; it does not prove a
number exists. A + calling code supplies country context without guessing a
default country. Local input is preserved. UI formatting and persisted data are
separate: secondary organization phone still needs its persistence contract.
No new Rust proficiency assessment or comprehension quiz.

## Structured names and contact choice — November 6, 2026

Built the next complete save slice while explaining Option and explicit request
fields. Correction recorded: Option<String> distinguishes Some(text) from None;
omitted and JSON null both map to None here, so it does not distinguish omitted
from intentionally cleared fields. Current save is a full replacement request.
Legacy full-name editing/conversion is explicit UI state, not guessed name parsing.
Rust derives display full_name from validated stored parts. Contact validation
checks both provided values and requires at least one; phone syntax supports
international formatting but not national numbering-plan verification yet.

45 backend/four bridge tests and expanded real Windows UI/restart smoke passed.
No user exercise, quiz or independent proficiency claim. Deeper Option/borrowing
review can use the new `email.is_none() && phone.is_none()` validation branch.

## Baseline repair and input inventory — November 6, 2026

Resumed e506cdd and started authorized development. Explained that a Rust struct
initializer must supply its fields even when they are Option types; `None` means
the value is absent, not that the field declaration disappears. Like a Python
data object with declared attributes, rather than an arbitrary dictionary; Rust
checks this during compilation. Added optional-name None fields to a legacy-name
test helper. Serde's handling of omitted JSON Option fields is separate behavior.

Runtime SQL tests exposed missing commas and obsolete test schemas; full app
initialization applies migrations before reads. Compiler success alone cannot
validate SQL strings. After repairs: 43 backend/four bridge tests and current
debug executable smoke passed. Inventory separates visible inputs from saved
data; phone-or-email/name wiring is next. Whisper still awaits field selection.
No user exercise, quiz or independent implementation proficiency inferred.

## Native CI verification — October 31, 2026

Both platform builds now verified on native runners. Introduced byte integrity:
Windows checkout newline conversion changed Bootstrap hashes, so browser blocked
CSS/JS; preserving vendored bytes fixes it without removing integrity protection.
Distinguished compiled universal Mac bundle/process startup from actual Mac UI
acceptance, and Windows debug full flows from release startup. Broughnut's own
coding/understanding not inferred from agent-driven CI or build success.

## Native packaging and cross-platform time — October 31, 2026

MVP now targets Windows and macOS per user. Explained native .exe versus .app
bundle, development tools versus end-user runtime, and universal Mac architecture.
Introduced stopwatch versus wall-clock comparison: Instant can exclude suspend;
SystemTime adds sleep-spanning expiry and backward clock errors require login.
`matches!` checks successful elapsed duration before renewal. Four deterministic
clock tests passed; those are not OS sleep tests. Windows release build/launch
and full debug UI smoke passed; Mac build still pending actual Mac execution.
No user coding exercise, quiz or independent proficiency claim.

## Full-duration inactivity acceptance — October 30, 2026

Explained UI timer versus backend authorization: `time.elapsed() <
self.inactivity_timeout` compares elapsed time to the allowed duration before
renewal. Non-renewing status reads observe expiry without keeping a session alive.
The optional real-executable test waited the actual 15 minutes (900.38 seconds),
checked clearing/access rejection, then re-login persistence. No timeout override
or production code change. OS sleep/wake/network-disconnect evidence remains
separate. No user exercise or independent proficiency claim; no quiz requested.

## Develop and learn agreement — October 30, 2026

User requests learning Rust during development and deeper review afterward,
rather than pausing development for a full source/course walkthrough. Python is
the reference language. Follow the develop/learn cycle in broughnut-workflow.md:
short goal/concept preview, complete feature work, tests, focused code review,
then continuity updates. No routine quizzes or comprehension checks; user says
they slow progress. Do not make learning an approval gate.

Latest source review covered main.rs module/use/entry point, builder/setup
closure, mutable paths, debug-only test-directory override, Option matching,
directory creation, managed state, and Ok(()). User explained mod/use distinction
at introductory level; clarified module membership and case-sensitive AppState.
Other details remain introduced, not independently practiced. Next development
is still region-filter IPC and repeatable fictional-data import; use those as
the next teaching examples. Deeper traits/lifetimes/transactions can be revisited
as needed, without blocking implementation.

## Teaching reset: Python baseline — October 30, 2026

User explicitly reports Python is their most comfortable language and that Rust/
compiled-language syntax is still confusing. The full profiles.rs walkthrough
was too dense. Use short sequential lessons grounded in actual code, comparing
with Python and introducing one unfamiliar concept at a time. User correctly
predicted add(10, 4) = 14 and restated the final-expression return idea; clarified
that -> i32 declares the return type while return selects a returned value.
Begin actual source walkthrough in startup order: src-tauri/src/main.rs, then
AppState::open/commands, JavaScript wrappers/callers, and backend profiles.
Current lesson starts at main.rs imports and entry point; advanced traits,
lifetimes, borrowing, and macros remain unconfirmed. No independent coding yet.

## profiles.rs walkthrough — October 30, 2026

Prepared a complete source walkthrough: imports, custom error enum, Display/Error/
From traits, Deserialize and unknown-field rejection, unit success values,
normalization, consuming self, Option helpers, email iterator/short-circuit logic,
transaction borrowing, row closures, parameterized SQL, ok_or, commit/rollback,
and archive retention. Explanation is introductory; understanding of these new
details has not been confirmed by teach-back or independent coding.

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

## Develop-and-learn: region and sample import — October 30, 2026

Applied the requested cycle while implementing real backend region queries and a
repeatable JSON sample import. Introduced Option<String> (similar to Python str
or None): trim blank values to None for All regions. Existing search_contractors
receives region.as_deref() as an optional borrowed string and None for skill.
Introduced HashMap as analogous to Python dict: dataset organization keys map to
actual saved IDs. Persisted stable keys let repeat import skip previously added
records without overwriting edits/archives. These concepts were explained briefly
during work; no quiz, user exercise or independent proficiency claim.

31 backend tests and four bridge tests passed; real UI import/filter/CRUD checks
passed. SQL remains in backend modules; new frontend calls stay in tauri-api.js.
Next learning review can use a small Option/filter or key-lookup excerpt. Deeper
traits/lifetimes/import parsing are deferred unless needed or requested.

HANDOFF OUT requested at the end of this session. Development/learning agreement,
Option/HashMap introduction, verified filter/import behavior and acceptance
backlog captured in checkpoint. Continue brief Python-grounded lessons during
work; no routine quizzes or inference of independent proficiency from tests.

## Release planning and Settings — November 6, 2026

Clarified Whisper as the speech-to-text engine within a full voice-input flow
(record/capture, conversion, transcription, review and save). Distinguished
portable application data import/export from developer Git handoffs. Added a
Bootstrap Settings modal for sample import; no new Rust syntax lesson or user
coding exercise occurred. No proficiency claim. Next implementation retains the
short Python-grounded develop-and-learn workflow in broughnut-workflow.md.

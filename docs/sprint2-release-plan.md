# Sprint 2: finished-product plan

November 7 user update: use sprint2-user-requirements.md for the reconciled laptop
checklist. User confirmed name plus phone OR email and explicitly required
database encryption and offline password recovery. Current source batch implements
details persistence (v5), security/recovery, country-aware phone formatting,
organization-region editing, system theme/toasts/pagination/login/logo fixes.
Final testing is now active: 49 backend and six bridge/voice tests pass. Windows
0.2.0 release compiled and an NSIS installer was generated; final source/package
alignment and UI accessibility are being checked. See
final-submission-verification.md for current evidence and remaining native Mac,
installed-build and manual accessibility checks. No ordinary app data migrated.
The source-audit table below is historical, not the current completion matrix.

Audit date: November 6, 2026. Local source: c172964 on dev; clean at audit start.
Broughnut owns the remaining frontend, backend, bridge, testing, and delivery
work. Earlier teammate ownership does not block authorized implementation.

## Delivery goal

Download a Windows setup .exe or macOS DMG containing Hippo Harbor CRM.app,
install it, and use the finished CRM without Rust, Node, Cargo, a terminal, or
runtime asset/model downloads. Preserve records and media across restarts and
application updates. Package the local Whisper engine/model when that feature
is complete. Installed-build evidence is required separately for each platform.

Initial delivery targets: Windows x64 and macOS universal (Apple Silicon/Intel).
The draft SOW also names Linux as final scope; do not silently remove that
commitment. Track its packaging/acceptance separately pending scope agreement.
The older draft excludes voice, superseded for implementation planning by the
user's explicit Sprint 2 Whisper request; client-approved SOW status is unchanged.

## What exists and where the remaining work is

This is a source audit, not a new full application acceptance run. Existing
documentation records earlier native build evidence, not current release proof.

| Area | Source evidence | Remaining delivery work |
| --- | --- | --- |
| Desktop foundation | src-tauri startup/commands; backend library; real CRUD/auth/filter/import flows | Expand authenticated commands for remaining features; preserve transaction and error behavior. |
| Packaging | Windows NSIS/offline WebView2 and macOS universal app/DMG scripts plus native CI | Build latest finished source, test fresh installations/upgrades and installed workflows, provide stable downloads/version/checksums; decide release signing/notarization. |
| Branding/tables | Hippo Harbor assets; locally vendored DataTables, jQuery, IMask | Check every requested layout, filter, notification, empty-state and pagination behavior in both themes; remove stale wording. |
| Theme | Saved manual light/dark toggle | Implement system preference initialization and live system-theme changes. |
| Contractor fields | Separate names now save/reopen; legacy full names preserved with explicit conversion; additional fields inventoried | Persist remaining agreed address/custom/media fields; requiredness decisions beyond current rules remain pending. |
| Contact rules | Standalone/inline contractors and Rust now require phone OR email; each provided value validated; US mask removed | Country-specific numbering validation awaits connected geography; organization/secondary-contact rules remain to define. |
| Organizations | Create/update/archive commands; backend additional-field functions; atomic organization/optional-inline-contractor creation | Persist secondary contacts/extra fields currently omitted from request; organization status control. |
| Media | Backend copy functions; frontend file selectors collect filenames | Implement actual file content/selection handoff, validation, local storage, protected display, replacement and restart checks for photos/logos. |
| Status/order/archive | Contractor Active/Inactive command; archive path; existing retired/deceased seed statuses | Support full intended statuses, audited changes, retired/deceased-last default ordering across pagination; verify explicit-sort/reset behavior; archive browsing/restore per agreed scope. |
| Tags/skills | Backend tables/functions/tests | Authenticated commands, UI assignment/removal, organization and contractor filtering, consistent accessible tag colors. |
| Search | Soundex backend query/test exists; bridge filter accepts region only | Expose fuzzy search and agreed combined filters; define clearing/no-match behavior and test real SQL path. |
| Notes/history/follow-up | Contact-note command and backend contact/history/decay functions | Read/display persisted timestamped notes and transfers/status history; skill/elapsed-contact filtering and never-contacted behavior; link actual records. |
| Native contact actions | Final draft calls for tel/sms/Teams handoff | Inventory existing UI actions; implement validated Rust-mediated native handlers and useful absent-handler errors. |
| Recovery | Local password/auth exists | Select recovery design, implement setup/recovery/error handling, preserve user data and test locked access. |
| Device data transfer | Embedded sample import only; no general import/export commands found | Add user-facing export/import for real application records and media, with portable references, version validation, explicit conflict handling, and rollback. |
| Whisper | voice-input-plan.md only; implementation explicitly deferred | Finish field inventory, choose voice-enabled fields, then local capture/conversion/transcription/review/cancel, authenticated IPC and bundled dependencies/model. |
| Samples | Repeatable embedded dataset/import exists | Demonstrate final fields, tags/colors/statuses/archive/media where supported; keep stable provenance keys, avoid duplicate/replacing user edits; remove Fictional from display names only. |
| Accessibility | Some labels/focus and UI checks exist | Full WCAG 2.2 AA evaluation, keyboard/screen-reader/contrast/focus/error/notification checks and fixes; no conformance claim before evidence. |

## Implementation order and exit gates

1. **Inventory and contract baseline.** List every existing/planned input and
   action; required/optional rules, types, validation and persistence destination.
   Include search, selections, dates and files. Record voice suitability rather
   than assuming every field gets dictation. Update IPC contracts, which currently
   contain stale claims about unsplit names and unimplemented organization edits.
2. **Reliable saved records.** Complete contractor/organization payloads and
   transactions, contact validation, country/region handling, inline create,
   statuses and ordering. Exit: create/edit/reopen verifies every supported field;
   failed saves leave no partial records; optional blanks behave as agreed.
3. **Find and follow up.** Complete tags/skills/colors, combined SQL filters,
   Soundex, contact notes, transfer/status history and native contact actions.
   Exit: deterministic data proves query/results and history persist after restart.
4. **Media and recovery.** Finish photos/logos and agreed password recovery.
   Exit: installed storage/display survives restart, invalid files/errors are
   useful, and recovery neither exposes protected data nor erases it silently.
5. **Whisper.** After inventory and field selection, prove local transcription
   on both targets, then recording/preview/edit/save and cancellation/lock behavior.
   Exit: installed app works offline with bundled runtime/model and no developer
   tools; temporary audio lifecycle and microphone permissions are verified.
6. **UI/accessibility/sample completion.** System theme, responsive tables,
   labels, branding/wording, notifications and full demonstration data. Run
   accessibility checks throughout, then consolidate final evidence here.
7. **Device data transfer.** Implement the portable export/import workflow below.
   Exit: Windows-to-Mac and Mac-to-Windows round trips preserve relationships,
   history, archives and images; bad/interrupted imports preserve existing data.
8. **Release candidate.** Build exact reviewed source on native Windows/macOS,
   run installed-package acceptance and migration/upgrade tests, document OS/CPU
   support and limitations, package version/checksums and download instructions.
   Publish only on explicit authorization. No further feature work inside this gate.

Each feature is developed as a small frontend-to-database slice and tested when
implemented. Bridging and testing happen throughout; the final pass consolidates
regression and installed-release evidence. Explain Rust with short Python
comparisons while developing; do not infer proficiency from agent-written code.

November 6 implementation start: input-contract-inventory.md now lists all 44
static controls plus generated and planned inputs/actions, validation/persistence
gaps, sensitivity and provisional voice suitability. IPC docs audited against
the 17 actual commands and structured-name/organization responses. Inventory is
not field-selection approval: Whisper remains deferred. Baseline Rust/SQL/branding
repairs are recorded in integration-changes.md; next is reliable saved records.
Structured-name and either-contact slice now passes 45 backend/four bridge tests
plus real Windows UI/restart checks. Remaining reliable-save work includes
addresses/custom fields. Organization-plus-inline-contractor creation now uses
one transaction and retains the form draft after failed saves.

## Release acceptance

- Fresh machine installs/opens without development tools; packaged UI and
  Whisper resources operate with OS networking disabled.
- Setup/login/recovery/lock/sleep-wake and protected commands work as specified.
- All agreed create/edit/archive/status/filter/search/media/note/voice flows
  work in the installed build, including errors and persistence after restart.
- Updating an existing installation retains database, media and login state
  according to the agreed session behavior; migrations preserve older records.
- Export on one device and import on another preserves all supported CRM fields,
  relationships, archived records, notes/history, tags/skills and image/logo files.
  Verify repeated import behavior and useful errors for incompatible or corrupt files.
- Light/dark and keyboard/screen-reader checks are recorded against WCAG 2.2 AA.
- Windows and macOS evidence identifies exact source/build, OS/architecture,
  tested scenarios, failures and remaining limitations. A compiled universal Mac
  app alone does not establish Intel and Apple Silicon hardware acceptance.
- Distribution is downloadable with version, checksums, installation directions
  and known limitations. Current macOS config is ad-hoc signed and Windows has
  no established release-signing evidence; smoother public installation requires
  a certificate/notarization decision, not merely renamed package files.

## Decisions needed before their dependent implementation

Password recovery mechanism; voice-enabled fields/languages/model tradeoff after
inventory; required/optional fields beyond phone-or-email; final Linux commitment;
demo distribution versus publicly signed/notarized release; import merge versus
workspace replacement, and transfer-file encryption/password handling. Continue independent
work while resolving these. Do not invent approved scope or purchase credentials.

Audit check: seven packaged UI integrity declarations passed on November 6.
No backend/full desktop suite or installed package was rerun for this document.

## Portable import/export requirement — November 6

The user requires moving application data between devices through the installed
app. This is separate from Git/developer handoffs and sample-data import.

Proposed design: one versioned portable archive containing structured CRM data,
media, and a manifest. Export must take a consistent snapshot; importing must
preserve relationships and remap media references into the destination app-data
directory rather than retaining source-machine absolute paths. Include archived,
retired and deceased records and timestamped history. Whisper engine/model
binaries are application resources, not user-record export content.

Use labeled export/import actions and native file selection. Validate format,
version, record references, file types, sizes, archive paths and integrity before
changing live data. Stage and validate media plus database work so cancellation
or failure cannot leave a partial import. Show a preview/summary and explicit
confirmation for any replacement or conflict resolution; preserve a recoverable
backup before destructive replacement. No silent overwrite or duplicate imports.

Before implementation, choose whether first-release import merges records or
restores/replaces a workspace, define stable identity/conflicts and repeated
import behavior, and decide encryption and credential handling. Do not transfer
session state or assume app login encrypts an exported file. These choices are
pending; export/import is required but not implemented by this planning update.

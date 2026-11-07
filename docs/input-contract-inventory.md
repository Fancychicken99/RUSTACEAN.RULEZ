# Input and action inventory

## November 7 source additions

Final backend/bridge tests pass; see final-submission-verification.md for platform
evidence. Voice scope is now implemented for free-text profile names, addresses,
notes and custom text, excluding credentials, phone/email, country/region,
selectors and searches. Earlier candidate/deferral notes are historical.

The saved laptop checklist is in sprint2-user-requirements.md. Required contractor
rule confirmed: structured first/last (or preserved legacy full name), phone OR
email and existing organization association; role and other details optional.
No new verification implied by earlier dated evidence in this inventory.

| New/changed controls | Contract and persistence | Voice |
| --- | --- | --- |
| recovery-code | Required masked recovery key, input max128; 64 hex digits after removing spaces/hyphens; recover_password, never logged/stored as plaintext by app | Exclude credential |
| recovery-password, recovery-confirm | Required matching new password; UI min12/max1024, backend min12 Rust characters/max1024 bytes; only new password sent | Exclude credential |
| issued-recovery-key, recovery-key-saved | Read-only one-time code; explicit saved acknowledgement before clearing/continuing; not localStorage | Exclude credential |
| current-password, new-password, new-password-confirm | Settings access rotation; requires authenticated/current password and matching new password; form cleared on request/lock | Exclude credential |
| cleanup-original | Authenticated explicit confirmation; removes redundant plaintext source only after integrity/fingerprint/sidecar checks | Manual destructive-copy action |
| theme-mode | System(default)/light/dark; persisted nonsecret preference, live OS listener in system mode | Manual |
| contractor-region-value / add/save/cancel region | Optional/max120 region on selected organization; command returns saved org, affects all linked records, contractor draft retained | Text candidate |
| contractor-country / organization-country | Optional free text/max100 with offline country suggestions; recognized country drives phone formatting/prefix, existing + code retained | Candidate after voice selection |
| contractor-country-filter / contractor-city-sector-filter | Enabled country/City search of saved fields; local narrowing of real SQL-region results, active pills | Manual/search candidate |
| generated custom relation selectors | Explicit accessible names; saved archived target option retained; missing target rejected at save | Manual |

New security IPC/storage semantics and verification queue: security-and-recovery.md.
Other current source additions: grouped details saved atomically, JSON v5 custom
storage, secondary contact preservation, multiline organization notes, bounded
logo sizes, Basic Details defaults and bottom-left pausable/dismissible toasts.
Custom row initialization now attaches controls before looking them up; prior
initialization order could dereference a missing control holder.

November 7 update: all four phone inputs format + country-code numbers using
offline libphonenumber-js metadata. Local numbers and invalid text are preserved.
Formatting does not change backend validation or implement secondary organization
phone persistence. Native typing, bulk insertion, caret edits/deletion and saved
contractor formatting after restart passed in the Windows executable.

Audited November 6, 2026 against e506cdd plus local baseline and name/contact changes.
Source audit, not a claim that every displayed field saves. See ipc-contract.md
for implemented wire contracts and sprint2-release-plan.md for delivery order.

There are now 44 static input/select/textarea elements in index.html (including
the explicit legacy full-name editor added in this slice), plus the
contenteditable note editor, generated custom fields, status switches, dashboard
alert selector and DataTables controls. Earlier integration.html is a retained
prototype, not the product input surface. Source files: index.html,
add-contractor.js, contractor-list.js, security-lock.js, sample-data.js,
theme-init.js/theme-toggle.js/global-ui.js, commands.rs and backend database/profiles modules.

## Rules and interpretation

- Confirmed contact requirement: at least one usable phone OR email, both allowed;
  validate each supplied value. Now enforced in standalone/inline contractor UI
  and Rust profile validation. The forced US mask is removed; phone accepts 7–15
  digits with documented international formatting. Country-specific numbering
  validation remains pending connected geography. Clarify organization and
  secondary-contact requirements separately.
- Other required/optional choices beyond existing contracts remain pending.
  The tables distinguish current HTML constraints from enforced backend rules.
- All records are potentially private CRM data. Passwords/recovery secrets are
  credentials; file/archive paths and audio need separate lifecycle controls.
  Do not log complete save payloads or accept unsanitized transcript markup.
- Voice labels below are recommendations for later selection, not authorization
  to enable recording or install Whisper. No field is selected yet. Text
  candidates need editable preview and explicit insertion; identifiers/numbers
  need careful correction. Selections/files/credentials remain manual controls.

## Authentication and workspace controls

| Control/input | Current rules and destination | Voice suitability |
| --- | --- | --- |
| password | Required, not trimmed; setup minimum 12 Rust characters; setup_admin/login; only hash stored by backend | Exclude: credential |
| confirm-password | Required only during setup; UI equality check; never sent/stored separately | Exclude: credential |
| global-search | Optional search string; local filtering, not backend Soundex yet; not a record field | Candidate, user selection pending |
| theme-toggle | Manual light/dark preference stored under northstar-crm-theme; initialization uses time of day, not OS preference; system option/live updates pending | Manual selection |
| dashboard alert-level-filter (generated) | All/30/60/90 thresholds; current display filtering depends on contact dates not exposed by list IPC | Manual selection |
| DataTables length, ordering and paging | View state; searching:false disables a separate generated table-search input. Global search above is the text control. Default retired/deceased-last ordering must span pages, with explicit sort overriding | Manual selection |

Login/setup/retry, lock/logout, sidebar, navigation/profile selection, refresh,
view/reset/clear-search and filter-panel open/close are actions, not text data.
Locked views clear/inert protected controls. Activity/status IPC renew/check
session as documented. General password recovery does not exist yet.

## Contractor editor

All rows refer to contractor-* IDs. Mutation wrapper: createContractor or
updateContractor, with a nested profile. Backend limits are Unicode scalar
counts, trims optional text, converts blanks to null and rejects control chars.

| Input IDs | Current rule | IPC/database destination and gap | Voice recommendation |
| --- | --- | --- | --- |
| prefix | Optional select; backend max 20 | profile.prefix / contractors.prefix now connected; existing values outside presets retained | Manual selection |
| first-name | Required/max 100 in structured mode; backend requires with last_name | profile.first_name / contractors.first_name now connected | Candidate with correction |
| middle-name | Optional/max 150 | profile.middle_name / contractors.middle_name now connected | Candidate with correction |
| last-name | Required/max 100 in structured mode; pair rule as above | profile.last_name / contractors.last_name now connected | Candidate with correction |
| suffix | Optional select; backend max 20 | profile.suffix / contractors.suffix now connected; existing values outside presets retained | Manual selection |
| legacy-name | Required/max 200 only when editing an older full-name-only record; separate parts disabled | Existing full_name and optional stored name metadata retained; Enter separate name fields explicitly switches to blank name parts, requiring first/last before save | Text candidate with correction |
| organization | Required existing non-archived ID on create; ID 1..9007199254740991; disabled on edit | request.organization_id; FK persists; transfer is separate, not a profile edit | Manual selection |
| role | HTML required select; backend optional/max 120 | profile.role persists; existing values outside presets retained, requiredness still differs | Manual selection; confirm Other behavior |
| email | Optional email/max 254 if phone present; backend basic one-@ dotted-domain validation | profile.email persists; every provided value validated, two empty contact values rejected | Candidate only with careful address correction |
| phone | Optional if email present; max 80 formatted chars, 7–15 ASCII digits; optional leading + and documented formatting | profile.phone persists; US mask removed; country-specific validation remains pending | Prefer manual entry/correction |
| street1, street2, city, state, country | Optional; street lines max 200, city/state/country max 100 | details.address now saved atomically and returned; verification deferred | Text candidates; choose country control design first |
| headshot | Optional file selector, accept=image/* is a picker hint | JS sends no content/path to backend, only logs a filename in discarded prototype payload. No image-save command or protected display | Native file selection, no dictation |

full_name is a legacy-compatible request field (default empty string), required
after normalization unless first_name+last_name produce it; maximum 200. Preserve
legacy names instead of guessing name components: the UI now uses the full-name
editor for legacy records and stored separate parts for structured records.
Explicit conversion does not guess any name tokens. No automatic name parsing.

Create/update saves the supported fields atomically. Archive retains data and
status; confirm/cancel actions are not new fields. Status changes currently use
an Active/Inactive switch and separate command; intended Retired/Deceased states,
audited transitions and default order still need integration. UTC created/updated
timestamps are system-owned; JS currently logs created_at but does not send it.

## Organization editor and inline contractor

| Input IDs | Current rule | Destination and gap | Voice recommendation |
| --- | --- | --- | --- |
| organization-name | HTML/backend required, max 200 | name persists; IDs distinguish same-name orgs | Text candidate |
| organization-region | Optional/max 120 | region persists; drives contractor region | Text candidate or selection, pending geography design |
| organization-email | Optional email/max 254, basic backend validation | email persists | Prefer manual/corrected address |
| organization-phone | Optional, no US mask class here; backend max 80 | phone persists; country-aware validation pending | Prefer manual |
| organization-notes | Optional textarea/max 5000; backend trims/rejects control chars, including multiline currently | notes persists for supported input; multiline behavior needs explicit contract/fix | Strong text candidate |
| organization-secondary-phone, secondary-contact, secondary-email | Optional; phone max 80 with shared syntax, contact name max 200, email/max 254 validated | details fields now saved atomically and all returned; verification deferred | Contact name candidate; numbers/addresses require correction |
| organization-street1, street2, city, state, country | Optional; street lines max 200, city/state/country max 100 | details.address saved atomically and returned; verification deferred | Text candidates; country design pending |
| organization-logo | Optional image/* file picker | Filename-only prototype, no contents handed off; actual persistence/protected display pending | File selection |
| inline-contractor-first-name, last-name | Required when expanded, max 100 each | Split request fields now persisted; hidden inline fieldset disabled for validation | Candidates with correction |
| inline-contractor-email, phone | At least one required; email/max 254, phone/max 80 and shared formatting rules | UI and Rust validate; saved in same transaction as organization | Prefer manual/corrected |
| inline-contractor-role | Required when section expanded | profile.role persists in combined save | Manual selection |

Inline creation now uses one create_organization request with optional contractor
ProfileFields and one backend transaction. Failed writes roll back both records;
the UI retains the draft for retry. Editing an org
hides inline create. Organization status exists as Active/Inactive in schema and
backend helper but the displayed switch is disabled and no status IPC exists.
Organization archive uses separate confirmation and retains contractor links.
An existing unregistered OrganizationExtraFields/update_organization_extra helper
validates secondary email (254), street lines (200 each), city/state/country
(100 each), trims optional values and updates updated_at. It does not establish
coverage for secondary phone/contact/custom data. Combined creation is atomic
for supported fields; new details integration is implemented but unverified.

## Generated custom fields (contractors and organizations)

Add Field creates field-name text, field-type select (short text, long text,
relation), value text/textarea, and for a relation entity-type and record-ID
selects. Remove Field edits only the draft. Names max 80, text max 500, long text
max 5000; max 30 fields/64 KiB serialized total. Relation choices use IDs;
saved archived relations get a labelled fallback option.

customFields() rejects incomplete/duplicate/reserved rows and ignores wholly
blank rows. Version 5 stores typed extra_information JSON objects on both record
types; backend validates fields and target existence. Existing archived relations
remain preservable; missing IDs rejected. Type changes replace that draft field.
Implementation verification is deferred; import identity handling still pending.
Names and textual values are voice candidates; type/record selectors remain manual.

## Filters, contact notes and record actions

| Input | Current rules/destination | Gap / voice recommendation |
| --- | --- | --- |
| contractor-region-filter | Optional trimmed region; filter_contractors SQL exact NOCASE match, max 120, blank=null/all | Manual selection |
| contractor-country-filter, contractor-city-sector-filter | Disabled text/search controls; no IPC/filter fields | No current persistence/query; text candidates only after geography contract |
| filter-organization | Optional org-ID view filter | Local narrowing of SQL region results; manual selection |
| filter-status | All, Active, Inactive, Retired, Archived, Deceased, Other Circumstance options | Local narrowing; archived rows are not returned by current list, so Archived needs real read/restore contract; manual selection |
| contact-note-method | Required Email/Phone/SMS/Teams/Other | record_contact_note checks allowlist; manual selection |
| contact-note-editor | Contenteditable rich-looking editor; HTML toolbar bold/italic; sends trimmed innerText, not HTML | Required note; backend max 5000, allows newline/tab; strong dictation candidate, final selection pending |

Notes are stored in contact_events with backend UTC CURRENT_TIMESTAMP
(YYYY-MM-DD HH:MM:SS). Current JS prepends a separate client ISO timestamp to
the note and updates only cached last-contact metrics. A history read command,
canonical timestamp response and persisted last-contact list fields remain absent.
Do not promise stored HTML formatting or restart-persistent UI metrics.

Other actions: contractor status toggle, edit, archive confirmation; organization
edit/archive/roster; sample import confirm/cancel now in authenticated Settings;
contact-note save/cancel/format; profile/dashboard routing. Native tel/sms/Teams
launch actions need a validated Rust-mediated contract; do not invent completion.
Sample import has no arbitrary file input, never replaces a workspace and uses
stable provenance keys. Settings currently offers sample import, not general
user-data import/export or voice/theme configuration.

## Planned inputs and unresolved contracts

| Workflow | Inputs/actions to specify before implementation | Voice/sensitivity |
| --- | --- | --- |
| Tags and skills | Create/select/assign/remove, accessible color choice, org/contractor scopes and combined filters | Label text candidate; colors/assignments manual; backend tag currently id/name only |
| Fuzzy search and follow-up | Query, skill selection, minimum days, never-contacted handling, clear/reset and sorting | Query text candidate; numeric/date/selection manual; backend helpers exist, commands not exposed |
| Status/transfer/history/restore | Full status selection, destination org, reason/note, archive browsing and explicit restore confirmation | Reason text candidate; selections/actions manual; audit dates system-owned |
| Media | Native picker/content handoff, format/size constraints, preview/remove/replace and persisted protected reference | Files/paths manual; limit/type decisions pending |
| Password recovery | Recovery setup/verification secret or other chosen mechanism | Credentials excluded; design pending, no silent reset/data loss |
| Portable export/import | Native destination/source picker, versioned archive, preview, stable-ID conflicts, merge vs restore, confirmation, encryption/password and media handoff | File/action/credential controls manual; design choices pending |
| Whisper | Field selection, language/model, microphone permission, record/stop/cancel, editable transcript and explicit insert/discard | Audio/transcripts private; all engine/model/recording implementation deferred until field scope selected |
| System theme | System/light/dark choice, persistence and live OS preference changes | Manual selection; not time-of-day inference |

No migration, media format, recovery mechanism, import conflict strategy, required
address/role rule, dictation field set, language/model or recording duration is
approved by this inventory. Continue independent slices while those decisions
are unresolved. Structured names and phone-or-email now have backend and actual
Windows UI/restart coverage. Atomic inline creation is implemented for supported
fields. Next extend address/extra-contact/custom-field saves with explicit limits. No full release
or Mac acceptance is implied by this Windows debug verification.

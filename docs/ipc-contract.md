# Implemented IPC contract

## 0.2.1 reconciliation — November 9, 2026

Schema 7 upgrades released schema 6 in place, preserving custom fields, media and
audit records, and adds the organization out_of_business_at marker. Portable
import accepts schemas 6/7 and upgrades the staged copy before activation.
Contractor responses append created_at/updated_at (UTC SQL or ISO timestamps,
nullable for compatibility). Organization status is Active, Inactive or Out of
Business; the closure marker preserves the older two-value SQL status constraint.

Additional authenticated commands: list_archived_records {} returns records with
entity_type (Contractor/Organization), id,name,status,details,created_at,updated_at,
archived_at. get_record_history {request:{entity_type,id}} uses lowercase
contractor/organization and returns {id,entity_type,entity_id,action,changed_fields,
occurred_at}[]. set_organization_status {request:{id,status}} returns the updated
organization. Full-profile history and the existing summary audit remain distinct
read models. Requests keep the typed details/address/custom-field contract below;
the conflicting duplicate raw extra_information request field was removed.

## Final Sprint 2 contract — November 7, 2026

31 registered commands in current source. All 49 backend and six bridge/voice
tests pass, including actual encrypted temporary workspaces and offline engine
transcription. Native UI/package acceptance is tracked separately in
final-submission-verification.md. Ordinary installed data was not migrated.

New final commands (all authenticated; frontend calls remain in tauri-api.js):

| Command | Request | Result |
| --- | --- | --- |
| workspace_snapshot | {} | {meta,archives,history,contacts,tags,skills} |
| workspace_action | {request: action object} | null after commit |
| search_records | {request: search object} | Contractor[] |
| load_record_image | {request:{kind,id}} | PNG data URI or null |
| export_workspace | {request:{password,new_password:null}} | export counts or null on native cancellation |
| import_workspace | {request:{password,new_password}} | {recovery_key,backup_name} or null on native cancellation |
| open_contact_action | {request:{id,method}} | null after native handoff |
| transcribe_audio | {request:{audio:number[]}} | recognized text for explicit review |
| cancel_dictation | {} | null |

kind is contractor or organization; positive IDs are database record IDs.
workspace_action is tagged by action: taxonomy {kind,id,tags,skills}, restore
{kind,id}, transfer {id,organization_id}, or organization_status {id,status}.
Contractor status uses the existing set_contractor_status command; organizations
support Active/Inactive and contractors additionally support Retired/Deceased.
Audit history records archive/restore, status changes and organization transfers.
Snapshot meta contains {kind,id,tags,skills}; archives contain
{kind,id,name,archived_at}; history contains {kind,id,event,detail,at}.

Search fields are optional/null: region,country,city,organization_id,status,
query,tag,skill,due_days. Text/phonetic, geography, taxonomy and age filters combine
in SQL. due_days includes never-contacted records. Archived records are excluded.
Contractor responses append last_contact_at (UTC timestamp or null) and
days_since_last_contact (derived nonnegative integer or null).

Profile/organization payloads support a details object with address,
extra_information and optional image:{bytes:number[]}. Organization details also
include secondary_phone, secondary_contact and secondary_email. Omitted/null
details preserve existing details on update; a supplied object replaces the group.
Custom fields are typed text, long_text or validated relation references. Media
selection sends actual file bytes; reads use record IDs, never frontend paths.
All new request types reject unknown fields. See backend/src/details.rs for bounds.

Native transfer dialogs choose paths; import previews counts and asks before
replacing the workspace. The new password becomes the imported workspace login
credential; source credentials are excluded. Recovery keys are shown once.
Native contact method is tel, sms or teams and uses validated stored values;
handoff does not send a message automatically. Voice accepts canonical mono
16-bit 16 kHz WAV, at most 120 seconds. Cancellation/locking invalidates results.
Transcription never automatically saves a record. Errors reject IPC promises;
UI success is emitted only after committed operations. Dates are UTC SQL
YYYY-MM-DD HH:MM:SS unless an existing API explicitly documents ISO format.

The security commands below remain part of the 31-command contract.

get_auth_status still accepts {} and does not renew activity. It now returns
`{ admin_exists: boolean, authenticated: boolean, database_encrypted: boolean,
legacy_copy_present: boolean }`. admin_exists comes from vault/legacy metadata;
database_encrypted describes the active configured store, not an integrity
attestation. Legacy original presence is surfaced until explicit cleanup.

setup_admin still accepts top-level `{password: string}`. Response is now
`{recovery_key: string}` instead of null. It provisions encryption and returns
the one-time recovery code; login remains a separate action. Password minimum
12 Rust characters/max 1024 UTF-8 bytes, untrimmed. login still returns boolean;
on first successful legacy migration it queues a one-time recovery code.

| Command / JS method | Arguments | Response / behavior |
| --- | --- | --- |
| take_recovery_key / takeRecoveryKey | {} | Authenticated; string or null. Consumes pending legacy-migration recovery code. |
| recover_password / recoverPassword | {request:{recovery_key:string,new_password:string}} | Available locked; {recovery_key:string} for new replacement code; original code/password superseded; data retained, session locked. |
| change_password / changePassword | {request:{current_password:string,new_password:string}} | Requires login/current password; {recovery_key:string}; replaces password/code, locks session. |
| remove_original_database / removeOriginalDatabase | {} | Requires login and UI cleanup confirmation; null. Integrity-check encrypted DB, check unchanged original/no sidecars, remove original copy only. |
| set_organization_region / setOrganizationRegion | {request:{id:positive safe integer,region:string or null}} | Requires login; persisted Organization. Region trim/max120/no controls, blank/null clears. Affects all linked contractors; does not create a contractor. |

Recovery code format: 64 hex characters, displayed as eight groups of eight with
hyphens. Input max128 bytes; spaces/hyphens ignored and hex case normalized.
Authentication/recovery failures have bounded in-process cooldowns; errors include
Please wait before trying again, Invalid recovery key, Incorrect current password,
encryption/metadata/file errors and Login required. No keys/hashes in auth status;
only issued recovery code crosses IPC. Missing/corrupt vault metadata refuses
silent initialization over existing encrypted files. Underlying encrypted key
must be available before database operations; lock/observed expiry closes it.

Country-driven formatting is frontend-only using offline metadata, not new IPC.
Stored country remains optional free text. Known country enables national-number
formatting and calling-code normalization once possible; explicit + numbers keep
their code, country changes do not rewrite them. Unknown country preserves local
input. Backend still applies numeric/length/syntax policy, not live-number checks.
Country/city UI filters narrow saved SQL-region results locally; not full SQL
combined filtering yet. Region is still organization-derived.

## November 7 details extension — implemented, verification deferred

Per user request, this development batch has not been compiled or tested yet.
Prior passing checks cover the earlier atomic-save slice only.

ProfileFields adds optional `details: RecordDetails | null`. Organization create
and update requests add optional `details: OrganizationDetails | null`.
Omitted/null preserves existing details on update; on create defaults remain.
An object replaces the entire details group: omitted/blank address fields clear
to null and omitted extra_information defaults to {}. The current UI sends the
whole group. Core profile replacement semantics remain unchanged.

RecordDetails: `address` object (optional/default {}), `extra_information` object
(optional/default {}). Address keys: street_address_1, street_address_2 (optional
string/null, max 200 each), city, state_province, country (max 100 each). Values
are trimmed; control characters rejected. OrganizationDetails adds optional
secondary_phone (max 80), secondary_contact (max 200), secondary_email (max 254).
Secondary phone/email use contractor syntax validation but are not required.
Organization main phone now shares that same syntax on create AND update.

extra_information maps unique trimmed names (1–80 characters, no controls) to
one of these tagged objects (unknown fields/types rejected):

- `{ "type": "text", "value": "..." }`: required trimmed text, max 500, no controls.
- `{ "type": "long_text", "value": "..." }`: required trimmed text, max 5000;
  CRLF/CR normalized to LF, LF/tab allowed, other controls rejected.
- `{ "type": "relation", "entity_type": "contractor" | "organization", "entity_id": positive safe integer }`:
  target must exist; archived targets allowed to preserve existing links.

At most 30 fields and 65536 serialized UTF-8 bytes total. Duplicate names after
trimming rejected. Reserved names __proto__, prototype, constructor rejected.
Frontend rejects incomplete/duplicate/reserved rows instead of silently dropping
or overwriting them; wholly blank rows are ignored. Relation selectors preserve
saved archived IDs as labelled options. No automatic relation remapping on import.

Schema version 5 adds JSON-object extra_information columns with {} defaults;
existing address/secondary columns reused. Migration is transactional. Contractor
list/single/search/region/skill/follow-up responses all include flat address fields
and extra_information. Organization response also includes secondary_phone and
secondary_contact. Details writes are inside the same transaction as core fields
and optional inline contractor; SQL failures remain generic save errors, validation
messages remain useful. No new IPC command or filesystem permissions.

Audited November 6, 2026. Implemented read/auth and supported mutation contract.
Input-to-storage gaps and proposed rules are in input-contract-inventory.md;
displayed form fields do not establish implemented persistence.
JavaScript wrappers exist in frontend/js/tauri-api.js. All seventeen commands below
are implemented in src-tauri/src/commands.rs and registered in main.rs.
frontend/index.html now uses them in the original CRM layout, without fixtures.
The Windows debug executable has real UI/IPC smoke coverage for authentication,
lists, profiles, organizations, lock and restart. The earlier bridge example and
integration.html remain reference/earlier implementation, not the default entry.

## Boundary and conventions

Load frontend/js/tauri-api.js before frontend callers. window.crmApi methods return promises
and never render HTML, access SQLite directly, or substitute fixtures. The
desktop build must expose Tauri's global core.invoke API. Browser use rejects
with a useful error. Keep all frontend backend calls in this file.

Commands and returned record fields use snake_case; wrapper methods use camelCase.
Arguments are top-level objects. Passwords are passed as { password: string },
never trimmed or logged. Rust commands must validate requests independently.
Rust Ok resolves with serialized data; Err rejects with a safe string. Wrappers
normalize failures to Error objects. UI callers must catch and display errors.
An empty array is success. Option fields serialize to explicit nulls.

## Registered commands

| Command / wrapper | Request | Success | Backend and access |
| --- | --- | --- | --- |
| get_auth_status / getAuthStatus | {} | { admin_exists: boolean, authenticated: boolean, database_encrypted: boolean, legacy_copy_present: boolean } | Vault status and session::is_authenticated. Available before login; does not renew activity. |
| setup_admin / setupAdmin | { password: string } | {recovery_key:string} | Vault provisioning. One-time only; reject if configured. Does not automatically log in. |
| login / login | { password: string } | boolean | session::login. True starts session; false is invalid credentials and locks session. |
| logout / logout | {} | null | session::logout. Safe when already locked; database-state lock failures reject. |
| list_contractors / listContractors | {} | Contractor[] | protected::list_contractors_if_authenticated. Requires active session. |
| list_organizations / listOrganizations | {} | Organization[] | Requires active session; database::get_organizations. |
| filter_contractors / filterContractors | { request: { region: string or null } } | Contractor[] | Authenticated; existing search::search_contractors SQLite region query. |
| import_sample_data / importSampleData | {} | ImportReport | Authenticated; embedded fictional-crm-v1 dataset only, explicit UI confirmation. |
| record_activity / recordActivity | {} | null | Requires active session; session::authorize_action renews only an unexpired session; otherwise Login required. |

Setup requires at least 12 Unicode scalar values, matching the backend's Rust
chars().count() rule. Login does not transform the supplied password. Database
failures reject rather than returning false. Setup must never overwrite an admin.
Auth status exposes metadata only, never passwords or password hashes.

Intended error strings: Login required; Database unavailable; Unable to load
contractors; Password must contain at least 12 characters; Administrator already
configured; Unable to configure administrator; Unable to read authentication
status; Login failed; Unable to load organizations. Internal errors must not expose SQL, paths, or credentials.

The executable uses a 15-minute backend inactivity timeout, pending client
agreement. It checks monotonic and wall-clock elapsed time, expiring
if either reaches the timeout; a backward clock anomaly locks the session.
This counts time across suspend even where Instant excludes it. Clock-policy
unit tests do not establish actual OS sleep/wake acceptance. No IPC fields changed.
Backend access checks remain authoritative. Status polling
every five seconds does not renew activity and clears expired display data.
Trusted pointer/keyboard/input events reset a 15-minute frontend timer and call
record_activity at most once per 30 seconds. Merely polling status never renews
the session. Background responses cannot reopen a locked UI. A new process or
page reload starts locked even if the admin persists. Full-duration and sleep/
wake timing still need system verification.

## Contractor response

| Field | JSON type | Meaning |
| --- | --- | --- |
| id | integer | SQLite ID, not a prototype UUID. |
| full_name | string | Stored name; do not infer first/last name splits. |
| prefix, first_name, middle_name, last_name, suffix | string or null each | Stored structured name parts; null for older full-name-only records. |
| organization_id | integer or null | Stable organization ID; null only for legacy/unassociated records. |
| organization_name | string or null | Joined organization name. |
| region | string or null | Organization region in the current schema. |
| status | string | Stored status; archive visibility is separate. |
| role | string or null | Role. |
| email | string or null | Email. |
| phone | string or null | Phone. |
| photo_path | string or null | Stored reference; does not grant webview access. |
| street_address_1, street_address_2, city, state_province, country | string or null each | Stored optional address fields. |
| extra_information | object | Named typed custom fields; empty object for existing records after migration. |

List results exclude archived contractors and are ordered by full_name. IDs must
remain within JavaScript's safe integer range. Mutation IDs are validated as
positive integers no greater than 9007199254740991. No date fields occur in this response.
Define timestamp format, timezone, nullability, and never-contacted behavior for
later history/contact commands before implementation.

## Changes affecting teammates

- Replace get_contractors/filterJson with list_contractors and no filter payload
  for this first slice. Filtering needs its own explicit contract; do not silently
  discard filter requests.
- Removed old fetchContractors, which had no repository callers. Use
  crmApi.listContractors(), then pass results to frontend rendering functions.
- Map full_name/organization_name explicitly; backend does not return name,
  first_name/last_name, organization, country/city, or elapsed-contact counters.
- A photo_path does not prove an image is displayable. Media access needs its
  complete storage/permission/display contract.
- Fresh databases need first-admin setup before login can work.

## Organization response and UI mapping

Organization has id (integer), name/status (strings), and nullable strings:
region, phone, email, notes, secondary_phone, secondary_contact, secondary_email, street_address_1, street_address_2,
city, state_province, country, created_at, updated_at. Organization status defaults
to Active and is constrained to Active/Inactive in the schema, but its UI switch
is disabled and no status mutation command is exposed. extra_information is an
object of typed custom fields. Logo content is not returned in this contract.
Results exclude archived organizations and are ordered by name. Migration
backfills created_at as UTC ISO YYYY-MM-DDTHH:MM:SS.sssZ for existing rows;
ordinary create/update workflows currently leave timestamp values unset/stale.
Do not present these dates as complete lifecycle auditing.
Contractor responses include organization_id in list, search,
region, skill, follow-up, and single-record reads. Rosters, counts, filter values
and form selections use IDs so duplicate names remain distinct.

The directory reads full_name and organization_name directly; profile routes
compare numeric IDs as URL strings. Country/city fields and contact dates are
shown as unavailable rather than inferred. Dashboard totals/regions derive from
loaded contractor records. History/follow-up metrics are unavailable. Current
search/status/organization filters operate locally on the backend region-query
results. Region selection and clearing both query SQLite. Dashboard totals and
region distribution remain based on the full list. No fixtures are loaded.

Organization update/archive and contact-note insert commands are implemented
below. Skill/decay/Soundex filtering, contact/history reads, media and native
quick actions still need commands/contracts. Backend helper existence is not IPC.
Both index.html and the earlier integration.html use the same IPC wrapper.

## Contractor mutations and organization creation

Every mutation takes one top-level argument, { request: ... }, and requires a
live authenticated session. Requests and nested profile objects reject unknown
fields; no ignored country/city/photo/status/organization-change payloads.

| Command / wrapper | request fields | Success |
| --- | --- | --- |
| create_organization / createOrganization | name: string; region, phone, email, notes: string or null (optional); contractor: ProfileFields or null (optional) | Persisted Organization, after both inserts commit |
| update_organization / updateOrganization | id: integer; name: string; region, phone, email, notes: string or null | Persisted Organization |
| archive_organization / archiveOrganization | id: integer | null after archive completes |
| create_contractor / createContractor | organization_id: integer; profile: ProfileFields | Persisted Contractor |
| update_contractor / updateContractor | id: integer; profile: ProfileFields | Persisted Contractor |
| archive_contractor / archiveContractor | id: integer | null after archive completes |
| set_contractor_status / setContractorStatus | id: integer; status: `Active`, `Inactive`, `Retired`, or `Deceased` | Persisted Contractor |
| record_contact_note / recordContactNote | id: integer; method: `Email`, `Phone`, `SMS`, `Teams`, or `Other`; note: string | null after insert |

ProfileFields: full_name (string, defaults to empty when omitted); prefix,
first_name, middle_name, last_name, suffix, role, email, phone (optional string
or null). With either first_name or last_name supplied as non-null text, both
must be nonblank after trimming (even when a fallback full_name was supplied);
full_name is derived by joining the validated name parts in order. Otherwise a
nonempty legacy full_name is required. Prefix/suffix max 20, first/last max 100,
middle max 150; combined full_name max 200. Updates REPLACE these fields;
omitted/null/blank optional values clear them to null. The frontend now submits
all supported name/contact fields explicitly; full_name is empty for structured
saves and Rust derives it. Legacy full-name-only records open with an editable
full-name field and null first/last parts, preserving any stored optional
prefix/middle/suffix metadata. Conversion to separate fields is explicit rather
than automatic parsing. Existing prefix/suffix/role values absent from
the dropdown presets are retained as selectable values. Address/custom/media
fields remain outside the supported profile request and are still dropped.
Create requires an existing non-archived organization and starts Active. Editing
preserves organization_id, status, photo, and history. Status changes use the
separate set_contractor_status command and accept only Active/Inactive. Transfers
remain a separate workflow. Organization active/inactive status is stored but
its status command/UI remains unconnected; archived_at is separate visibility.
Organization names need not be unique; IDs identify records. Blank region is null.
Organization phone, email, and notes are trimmed and persisted; email receives the same basic plausibility validation as contractor email. Archiving an organization sets its `archived_at` timestamp in UTC and hides it from the active organization list. Existing contractors retain their records and organization association.

Backend normalization trims values. Full name/organization name must be nonempty
and at most 200 Unicode scalar values; role/region max 120, email max 254, phone
max 80. Normalized strings may not contain control characters. Optional blanks
become null. Provided email must have one @, nonempty local/domain portions, a
dotted domain without leading/trailing dot, and no whitespace. This is a basic
plausibility check, not complete RFC validation. Contractor saves require at
least one phone OR email, with each supplied value validated independently.
Phone accepts 7 to 15 ASCII digits with an optional leading +, ASCII spaces,
hyphens and balanced non-nested parentheses; a leading + must be followed by
a nonzero digit. Formatting is preserved after outer whitespace trimming.
Letters/extensions, extra plus signs, invalid parentheses and too few/many
digits reject, even if email is valid. Error for neither is
Enter a phone number or email address. Existing bad contact values need explicit
correction/clearing when saving, not silent database rewriting.
Frontend standalone/inline contractor forms enforce the same contact rule and
show the tab containing an invalid field before reporting native validity.
The frontend formats numbers beginning with + using locally bundled
libphonenumber-js 1.13.15 metadata. No country is assumed for local input.
All four phone controls use it; digit content is preserved during formatting and
invalid text stays visible for validation. No new request/response fields or
backend rules. Secondary organization phone persistence remains pending.
There is no forced US phone mask. This is international-format syntax validation,
not active-number verification or country-specific numbering-plan validation.
Country-aware rules await connected geography data. Organization contact
requiredness/validation is not expanded by this contractor slice.
Region comes from organization, not a contractor input.
Organization notes max 5000 currently use the same control-character
rejection, so multiline textarea content needs a deliberate normalization fix.

Organization creation optionally accepts `contractor` using the existing
ProfileFields names, nullability and validation. Omitted/null means no inline
contractor; an object must pass the same validation as standalone creation.
The organization ID is assigned by the backend; no organization_id inside this
object. Both records are saved in one transaction; any validation/write/commit
failure returns an error and leaves neither record. Response stays Organization;
the normal directory refresh retrieves its linked contractor. UpdateOrganization
does not accept contractor. No new command, date fields or naming convention.

Inputs are validated again in backend profiles.rs. Contractor create/update use
transactions and return only after commit; partial field saves roll back. Errors
include Full name is required, Organization name is required, field length/control
messages, Enter an email such as name@example.com, Record ID must be a positive
safe integer, Organization not found or archived, and Contractor not found or
archived. Internal SQL failures map to Unable to save contractor, Unable to save
organization, or Unable to archive contractor without exposing SQL/paths.

Archive uses archived_at to hide the record, never DELETE, and preserves its
status/fields. Existing SQLite CURRENT_TIMESTAMP supplies archived_at in UTC
(YYYY-MM-DD HH:MM:SS); it is not returned by these commands. Repeated archive or
editing an archived/missing ID rejects. No restore UI or permanent deletion is
introduced. If saving succeeds but directory refresh fails, UI reports the save
separately and instructs the user to reopen the workspace rather than resubmit.

set_contractor_status requires an active session, a positive safe ID, and one of
Active, Inactive, Retired, or Deceased. record_contact_note accepts the existing contact method set and
a nonempty note up to 5000 characters; SQLite supplies contacted_at in UTC.

## Region filter and fictional-data import

filter_contractors accepts a request with an optional region. Missing/null/blank
means all unarchived contractors. Nonempty values are trimmed, limited to 120
Unicode scalar values, rejected for control characters, and compared by the
existing SQLite NOCASE region query. Unknown regions return [] successfully.
Unknown request fields reject. Internal errors use Unable to filter contractors.
This is exact region equality, not fuzzy geography or country/city filtering.

Frontend directory requests use separate generations from full-list refreshes;
old/out-of-order/locked-session responses are ignored. Pending queries show a
loading state. Failure shows a visible error and Unavailable count, never cached
rows presented as a successful result. Clearing sends region:null to the backend.

ImportReport fields: dataset_id (string), organizations_added, contractors_added,
organizations_skipped, contractors_skipped (nonnegative integers). The embedded
JSON version fictional-crm-v1 contains 6 organizations, 60 contractors, 6 skills,
4 statuses, 48 contact events and 12 never-contacted profiles. Last-contact values
are UTC YYYY-MM-DD HH:MM:SS; as_of is YYYY-MM-DD. Dates persist; elapsed days are
not stored. Display/follow-up UI wiring is separate from this import contract.

The command accepts no user file/path/JSON payload. It validates the dataset and
imports in one transaction, including provenance rows keyed by dataset_id and
record_key in synthetic_organizations/synthetic_contractors. Repeats skip mapped
records, preserving user edits/archives and avoiding duplicate contacts/links.
Manual records are not merged or overwritten by matching names/emails. Existing
case-insensitive skill names can be reused as dictionary entries. No reset, bulk
delete, automatic startup import, or restore is exposed. Parsing/internal SQL
errors return Unable to import sample data; invalid records/reference/date/keys
return safe validation messages. Entire import rolls back on failure.

The JSON is embedded by Rust include_str! at build time, outside frontend assets.
serde_json is now declared in the backend; both Cargo lockfiles were updated.
Preserve stable keys; updating a dataset version requires an explicit migration/
import decision rather than silently replacing existing imported records.

## Organization contact, lifecycle, archive, and change history

Organization create/update requests now also accept `contact` with nullable
`secondary_phone`, `secondary_contact`, `secondary_email`, `street_address_1`,
`street_address_2`, `city`, `state_province`, and `country`. Blank values are
stored as null. The frontend passes the whole contact object to Rust; it is no
longer silently discarded. Organization responses include these values plus
`created_at`, `updated_at`, `archived_at`, and `out_of_business_at`.

`set_contractor_status` accepts Active, Inactive, Retired, or Deceased.
`set_organization_status` accepts Active, Inactive, or Out of Business. Marking
a record Out of Business does not delete or auto-archive it; use the existing
archive action when it should leave the active directory. Its status is retained
in the archive. `list_archived_records` returns retained contractor and
organization summaries, statuses, details, and UTC creation/update/archive
dates. No restore or delete action is exposed.

`get_record_history({entity_type, id})` returns newest-first entries with
`id`, `entity_type`, `entity_id`, `action`, `changed_fields`, and `occurred_at`
(UTC ISO timestamp). SQLite triggers record profile creation, changed field
groups, status and archive changes, and contact-note entry dates. Notes and
field values are not duplicated into the audit table. History is available on
contractor profiles and through the organization History action. Older edits
that happened before audit tracking was installed cannot be reconstructed.

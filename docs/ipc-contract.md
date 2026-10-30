# Initial IPC contract

Updated October 30, 2026. Implemented read/auth and contractor mutation contract.
JavaScript wrappers exist in frontend/js/tauri-api.js. All thirteen commands below
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
| get_auth_status / getAuthStatus | {} | { admin_exists: boolean, authenticated: boolean } | admin::admin_exists and session::is_authenticated. Available before login; does not renew activity. |
| setup_admin / setupAdmin | { password: string } | null | admin::create_first_admin. One-time only; reject if admin exists. Does not automatically log in. |
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

The initial executable uses a 15-minute backend inactivity timeout, pending
client agreement. Backend access checks remain authoritative. Status polling
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
| organization_id | integer or null | Stable organization ID; null only for legacy/unassociated records. |
| organization_name | string or null | Joined organization name. |
| region | string or null | Organization region in the current schema. |
| status | string | Stored status; archive visibility is separate. |
| role | string or null | Role. |
| email | string or null | Email. |
| phone | string or null | Phone. |
| photo_path | string or null | Stored reference; does not grant webview access. |

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

Organization has id (integer), name (string), and region (string or null).
Results exclude archived organizations and are ordered by name. No date fields
are returned. Contractor responses now include organization_id in list, search,
region, skill, follow-up, and single-record reads. Rosters, counts, filter values
and form selections use IDs so duplicate names remain distinct.

The directory reads full_name and organization_name directly; profile routes
compare numeric IDs as URL strings. Country/city fields and contact dates are
shown as unavailable rather than inferred. Dashboard totals/regions derive from
loaded contractor records. History/follow-up metrics are unavailable. Current
search/status/organization filters operate locally on the backend region-query
results. Region selection and clearing both query SQLite. Dashboard totals and
region distribution remain based on the full list. No fixtures are loaded.

Skill/decay command filtering, organization update/archive, contact/history,
media, and native quick actions need later contracts and registered commands.
Both index.html and the earlier integration.html use the same IPC wrapper.

## Contractor mutations and organization creation

Every mutation takes one top-level argument, { request: ... }, and requires a
live authenticated session. Requests and nested profile objects reject unknown
fields; no ignored country/city/photo/status/organization-change payloads.

| Command / wrapper | request fields | Success |
| --- | --- | --- |
| create_organization / createOrganization | name: string; region: string or null (optional) | Persisted Organization |
| create_contractor / createContractor | organization_id: integer; profile: ProfileFields | Persisted Contractor |
| update_contractor / updateContractor | id: integer; profile: ProfileFields | Persisted Contractor |
| archive_contractor / archiveContractor | id: integer | null after archive completes |

ProfileFields: full_name (required string), role/email/phone (optional string or
null). Updates REPLACE these profile fields; omitted/blank optional values clear
them to null. The UI submits all displayed fields. Name is not split/inferred.
Create requires an existing non-archived organization and starts Active. Editing
preserves organization_id, status, photo, and history. Transfers and status
changes need separate audited workflows; this editor does not perform them.
Organization names need not be unique; IDs identify records. Blank region is null.

Backend normalization trims values. Full name/organization name must be nonempty
and at most 200 Unicode scalar values; role/region max 120, email max 254, phone
max 80. Normalized strings may not contain control characters. Optional blanks
become null. Provided email must have one @, nonempty local/domain portions, a
dotted domain without leading/trailing dot, and no whitespace. This is a basic
plausibility check, not complete RFC validation. Phone is free text within its
length/control limits. Region comes from organization, not a contractor input.

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
separately and asks for Refresh rather than resubmitting a duplicate create.

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

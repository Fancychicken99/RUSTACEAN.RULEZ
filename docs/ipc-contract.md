# Initial IPC contract

Updated October 29, 2026. Target for the first integration slice.
JavaScript wrappers exist in frontend/js/tauri-api.js. All seven commands below
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
| organization_name | string or null | Joined organization name. |
| region | string or null | Organization region in the current schema. |
| status | string | Stored status; archive visibility is separate. |
| role | string or null | Role. |
| email | string or null | Email. |
| phone | string or null | Phone. |
| photo_path | string or null | Stored reference; does not grant webview access. |

List results exclude archived contractors and are ordered by full_name. IDs must
remain within JavaScript's safe integer range; address explicit ID validation
before adding commands accepting IDs. No date fields occur in this response.
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
are returned. Current contractor records lack organization_id: duplicate
organization names make per-organization roster/count lookup ambiguous, so the
UI disables those ambiguous rosters/counts pending an extended contract.

The directory reads full_name and organization_name directly; profile routes
compare numeric IDs as URL strings. Country/city fields and contact dates are
shown as unavailable rather than inferred. Dashboard totals/regions derive from
loaded contractor records. History/follow-up metrics are unavailable. Current
search/status/region/organization filters are frontend filters of the loaded
records, not verified backend filtering. No fixtures are loaded.

Create/update/archive, organization creation, region/skill/decay filters, contact/history,
media, and native quick actions need later contracts and registered commands.
Both index.html and the earlier integration.html use the same IPC wrapper.

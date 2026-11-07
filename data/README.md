# Fictional CRM sample dataset

synthetic-contractors-v1.json is a reusable, entirely fictional dataset generated
for this project. No real contractor records or images are used. All names and
organizations are synthetic (without a repeated Fictional display prefix), emails use example.com, and phone numbers
use the fictional 202-555-0100–0159 range. No credentials are included.

Version fictional-crm-v1 retains stable provenance keys: 60 profiles (56 active
directory records and four archived examples), six
organizations/regions, four statuses, six skills, 48 UTC contact timestamps and
12 never-contacted profiles. Contact dates are stored, not elapsed-day counters;
elapsed time is derived from those dates. Samples include split names, addresses,
custom fields, secondary organization contacts, tags/skills and generated
synthetic portraits/logos. Images are created locally during explicit import;
there are no developer-specific absolute image paths in the dataset.

The explicit authenticated Import fictional samples action embeds this file at
build time. No automatic startup import and no arbitrary file/path access.
The backend validates it and imports all records in one transaction. It records
(dataset_id, record_key) mappings in synthetic_organizations and
synthetic_contractors. Repeating the action skips mapped records, preserving
edits/archives and avoiding duplicate contacts/skills. It does not merge into
manual records even if names/emails happen to match. Existing skill names may
be reused as shared skill dictionary entries.

Do not change existing keys to refresh records; repeat import intentionally does
not overwrite user changes. New dataset versions need an explicit migration/
import decision, rather than an assumed overwrite. Archive retains imported
records; there is no destructive reset or bulk-delete endpoint.

Run scripts/test-backend.ps1 and scripts/test-desktop-smoke.cjs (after rebuilding)
for isolated import/filter/persistence checks. Tests do not use ordinary app data.

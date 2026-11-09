# Sprint 2 user requirements — reconciled November 7, 2026

Broughnut supplied the earlier laptop notes directly in this chat. This file
preserves them as an implementation checklist; it does not claim completion or
client approval. Broughnut owns all remaining work. Inspect every fetched branch
before duplicating implementation. November 7 fetch: main, josseline-backend,
codex/fix-offline-table-assets and origin/dev all contained in current dev;
no unmerged commits found. Laptop-only/unpushed files were not accessible.

User requested test execution be deferred to the end of the development batch
to reduce usage. Mark new work unverified; earlier passing checks do not verify
later changes. Final verification includes real executables, migration, and
visual/accessibility review on each target. Do not publish without authorization.

## Appearance and interaction

- Preserve approved Hippo Harbor branding and Hope UI; improve polish throughout.
- Pagination must match dark mode. Use DataTables for grid views.
- Default new contractor editor to Basic Details every time.
- Global wording: remove region-specific assumptions and redundant/outdated text.
- Add region workflow from contractor editor; connect it to actual stored data.
- Remove Private workspace tag, single-user profile section, manual refresh,
  unavailable-logo message, and explicit locked notification toast.
- Harbor-themed login/lock screen; subtle lock UI and updated critical alerts.
- Bottom-left success notifications that fade after a short interval. Keep
  actionable errors available long enough to read/correct; do not hide failures.
- Directional sidebar arrow; consistent brand colors/icons and useful empty states.
- Every input has an accessible name/label; keyboard, focus, contrast and error
  behavior included in WCAG 2.2 AA evaluation. No conformance claim before evidence.
- Default theme follows OS and responds to OS changes. Older clock-based dark-mode
  suggestion is superseded by the user's explicit system-theme preference.
- Show all active filters as removable pills above tables.
- Reactive refresh after successful transactions; no success before commit.

## Fields and records

- Split first/last names, standardized role selection with legacy preservation.
- Country-based phone calling-code prefix plus international as-you-type masking;
  do not silently corrupt an existing international number when country changes.
- Numeric/length validation, without country-specific or live-number claims
  beyond what is actually implemented.
- CONFIRMED SAVE RULE: user selected option 2 on November 7: name plus phone OR
  email. Optional fields may be blank. Older phone-AND-email and unrestricted
  incomplete-record suggestions do not override this decision.
- Contractor photos and organization logos: actual selected content, local storage,
  validation, protected display/replacement; filename-only inputs are insufficient.
- Organization edit, phone, secondary contacts, detailed notes, optional inline
  contractor; keep combined writes atomic.
- Contractor/organization Active/Inactive switches; final statuses, ordering and
  archive/read/restore behavior tracked in release plan.
- Timestamped contact notes; persisted notes/history display.
- Soundex fuzzy search; tags/skills for both record types and combined filtering.
- Samples demonstrate all supported fields and include archived records. Remove
  Fictional from display names, while retaining synthetic provenance, example
  domains and no real personnel data. Imports must remain repeatable/safe.

## Security and delivery

- Database encryption and password recovery are explicitly REQUIRED by November 7
  user instruction, not optional pending requirements. Implementation choices may
  be made by agent; no security questions or email service requirement was supplied.
- Chosen implementation direction: SQLCipher database with a random key; password
  and offline recovery key wrap that key separately. Recovery changes access while
  preserving records. One-time recovery-key display and rotation; no hardcoded key.
- Existing plaintext database migration must preserve records and avoid silently
  leaving an unencrypted backup. Surface remaining originals and provide explicit
  cleanup only after encrypted-copy verification. Media encryption is a separate
  boundary: database encryption alone does not encrypt photos or exports.
- Nice native Windows .exe installation and macOS .app/DMG delivery without
  developer tools. Latest installed-build evidence still required. Track Linux
  separately per draft SOW; no automatic scope removal.
- User observed an oversized/cropped logo in a launched executable. Explicitly
  constrain login/sidebar logo dimensions and include small-window/full-image
  visibility in the final visual checks. No assumed native-size rendering.
- Portable import/export and local voice dictation remain user-required work from
  earlier planning. Source implements pinned offline multilingual dictation and
  encrypted portable transfer with confirmed workspace replacement. Hardware
  microphone and native-platform acceptance remain separate checks.

## Current implementation boundary

Prior Windows-verified: core CRUD/auth, sample import/filter, structured names,
international + prefix formatting, atomic organization/inline creation. Branch
work already includes parts of UI redesign, tags/search backend and DataTables;
audit actual coverage rather than reimplementing or claiming full completion.

Current schema v6 includes optional address/secondary-contact/custom fields,
encryption/recovery, media, taxonomy/history/archive workflows and combined search.
Country-derived formatting, system theme, notifications, logo/layout fixes,
portable transfer and reviewed offline dictation are implemented. All 49 backend
and six bridge/voice tests passed. Current executable UI/accessibility and package
acceptance are tracked in final-submission-verification.md; source implementation
alone does not establish complete platform acceptance.

# Secure Military Contractor CRM — revised Statement of Work

Draft revision: October 29, 2026. Client: Benjamin Burchfield.
Prepared by: Junior Development Team (three members).

This proposed revision incorporates feedback on the October 23 draft's storage,
security, and runtime claims. Sprint allocation and acceptance criteria below
require team/client agreement; this document does not establish acceptance or
claim that any feature is complete. The original delivery window was 14 days;
exact milestone dates remain to be confirmed.

## Objective and architecture

Deliver a locally installed CRM executable using Rust, Tauri, HTML/CSS/JavaScript,
and SQLite through rusqlite. Use the Hope UI Bootstrap-based presentation layer.
JavaScript requests operations through registered Tauri IPC commands. Commands
validate requests and access, call backend modules, and return serializable
results or useful errors. Backend modules own SQL and file persistence.

Core CRM operations must work without internet connectivity. Package required UI
assets locally. Store the database, contractor images, and organization logos in
the operating system's application data directory; store media references in
SQLite. Capacity is limited by available disk space and tested workloads; no
petabyte-scale capacity or performance guarantee is made.

Final platform targets remain Windows, macOS, and Linux. Document supported OS
versions, packaging, and any required platform webview components. End users
must not need Rust, Cargo, Node.js, or a development environment. Any webview
prerequisite and its offline provisioning must be documented and verified per
platform; a universal dependency-free executable is not promised.

## Proposed Sprint 1 MVP

Demonstrate one integrated Windows executable to the client. This milestone is a
subset of final scope, not a claim of three-platform completion.

Acceptance checks:

1. Launch the executable on a documented Windows environment with networking
   disabled; navigation and required UI assets work.
2. Set up a local password, authenticate, reject an incorrect password, and
   enforce a documented inactivity timeout. Protected commands reject locked
   sessions; an overlay alone does not satisfy this requirement.
3. Browse persisted synthetic contractors and their organizations, view a
   selected record, create a contractor associated with an organization, edit
   supported profile fields, and archive it without erasing its stored record.
4. Close and reopen the executable and verify saved edits and archive state.
5. Filter records by region through the real backend and clear the filter.
6. Show useful validation/backend errors and a distinct empty-result state;
   do not silently replace failed operations with fixture data.
7. Provide 50+ synthetic contractor profiles with varied organizations and
   regions in reusable seed data and a documented repeatable import process
   that avoids duplicate records.

Demonstration evidence must identify the build, environment, tested scenarios,
and known limitations. Backend-only tests and browser prototypes are supporting
evidence, not substitutes for executable acceptance checks.

## Final release scope

- Contractor and organization create/read/update/archive workflows. No normal
  workflow permanently deletes entities. Support Active, Inactive, Retired,
  and Deceased contractor statuses with clearly defined archive behavior.
- Timestamped chronological history of organization transfers and status changes.
- Region, skill-set, and days-since-last-contact filtering; derive elapsed days
  from stored contact dates and define behavior for never-contacted records.
- Local image/logo selection, validation, storage, retrieval, and display that
  survives executable restart. Document supported formats and size limits.
- Validated Rust-mediated tel:, sms:, and msteams: handoffs to installed native
  protocol handlers. Handle absent handlers and invalid input usefully. External
  communication applications may need network access; core CRM use does not.
- Local password validation and inactivity locking enforced at the backend
  boundary. These controls do not claim disk encryption, absolute security,
  formal security certification, or protection from a compromised host OS.
- Controlled database access appropriate to the chosen implementation. A
  connection pool is not an acceptance requirement; document and test the
  chosen connection and concurrency model.
- Packaged executable/build instructions and recorded system-test results for
  each final target platform, plus final demonstration and presentation.

## Exclusions and assumptions

No real contractor information is permitted in development, tests, or demos.
Voice dictation, interactive offline maps, external identity/MFA integration,
and formal NIST compliance remain outside this phase. AI assistance may be used
for development and synthetic data; no runtime AI service is required.

No absolute security or zero-network-leakage guarantee is made. Core operation
must not depend on remote services; verify offline functionality and review
remote resource references. Additional security assurances require a separately
defined threat model, controls, and verification scope.

## Team responsibilities and evidence

- Connor: frontend layout/rendering, forms, navigation, packaged UI assets,
  visible loading/empty/error states, and UI inactivity events.
- Josseline: SQLite schema/functions, persistence, filtering/history, local
  authentication/session logic, media storage, and safe seed import support.
- Broughnut: Tauri workspace/commands, shared IPC contracts, integration,
  synthetic dataset, executable test orchestration, packaging coordination,
  final slides, and requirement-to-evidence mapping.

Ownership guides coordination; completion requires integrated behavior. Record
passed, failed, blocked, and deferred scenarios separately. Changes to milestone
scope or platform commitments require team/client agreement.

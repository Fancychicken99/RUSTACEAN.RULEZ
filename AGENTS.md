# Coding Agent Instructions

## Project context

RUSTACEAN.RULEZ is a student contractor CRM project for Dr. Burchfield. The intended stack is HTML/CSS/JavaScript with Hope UI, Tauri IPC, and Rust with SQLite through rusqlite. High-resolution images are intended to live on the local filesystem, with references stored in the database.

Use the Statement of Work as the source of truth for required features. If unavailable, state assumptions and do not invent requirements or claim compliance without evidence. Inspect the current repository before assuming the intended stack is fully implemented.

## Human team and ownership

- Connor — Frontend & UI Lead: visual design, Hope UI, dashboard, contact list, profile pages, and UI event handling.
- Josseline — Backend & Data Lead: Rust data functions, SQLite schema and queries, CRUD, filtering, and local image storage.
- Broughnut (the user) — Bridge & Project Manager: Tauri commands, shared data contracts, integration, 50+ fictional contractor profiles, final slide deck, and Statement of Work defense.

Default to supporting the user's bridge role. Keep SQL and persistence in backend modules and visual rendering in frontend modules. Bridge commands validate requests, call backend functions, and return serializable results or useful errors. Ownership guides implementation but does not prohibit edits authorized by the user. Explain interface changes that affect teammates.

## Human-in-the-loop workflow

1. Inspect the current branch, working tree, relevant files, and applicable instructions before editing. Preserve user changes and do not switch branches automatically.
2. Briefly explain the intended change and material assumptions before implementation.
3. Complete authorized, reversible work without repeatedly asking permission. Ask focused questions when missing requirements block progress; continue independent work where possible.
4. Keep changes small and reviewable. Avoid unrelated refactoring, dependencies, or architecture changes.
5. Verify behavior with available tools. Distinguish implemented behavior, simulated behavior, and verified end-to-end behavior.
6. Give the human a concise review handoff: changes, purpose, checks performed, limitations, and remaining decisions, with links to relevant files.

Do not commit, push, merge, publish, deploy, delete user data, or reset Git history without user authorization. Prepare a concrete, reviewable result before requesting approval for those actions. Do not message teammates or external services without explicit authorization. Do not spawn subagents unless the user explicitly requests delegation or parallel agent work.

## Optional personal workflow (Broughnut only)

For a session explicitly identified as Broughnut's, read
`docs/broughnut-workflow.md` and follow its personal learning/continuity rules.
Otherwise skip that file and the personal handoff/learning documents. Connor,
Josseline, and their agents have no obligation to read, update, or synchronize
those notes. Do not ask users to identify themselves merely to activate this
optional workflow. Shared project instructions in this file still apply to all.

## Optional handoffs (any team member)

Anyone may use HANDOFF IN, HANDOFF OUT, or CHECKPOINT as a standalone instruction.
Read `docs/device-workflow.md` when invoked; these keywords do not activate
Broughnut's personal teaching workflow for teammates.
Do not offer, suggest, or prompt for handoffs automatically. Use this system only
when the current user explicitly requests a handoff/checkpoint or invokes a
keyword. Do not message or notify teammates about it. HANDOFF OUT explicitly
authorizes its scoped commit/push as defined in the device workflow.

## Integration conventions

- Confirm Tauri/Rust scaffolding and database functions exist before depending on them. A JavaScript invoke call does not prove its backend command is implemented.
- When implementing integration, document command names, request/response fields, naming conventions, nullability, date formats, and errors in docs/ipc-contract.md.
- Use typed, serializable request/response structures and APIs appropriate to the installed Tauri version. Verify version-specific APIs before introducing them.
- Centralize frontend backend calls in tauri-api.js. Return data to page rendering functions instead of building page layout inside the bridge.
- Align frontend payload names with Rust serialization. Resolve differences such as firstName versus first_name explicitly.
- Propagate failures so the UI can display useful errors. Report success only after the operation completes.
- Separate fixture data from real data access. Do not silently substitute mock records when backend operations fail.
- Image filename/type/size metadata alone cannot save an image. Define the content or file-selection handoff, backend validation, saved reference, and frontend display together.
- Use portable application data locations rather than hardcoded user-specific paths. Configure filesystem access and Tauri permissions for the actual implementation.

## Synthetic data

Use clearly fictional contractor identities and organizations, example-domain emails, and synthetic images or placeholders. Do not introduce real military personnel records, personal contact information, credentials, or sensitive operational information.

Keep reusable seed data in a dedicated data directory when introduced. Coordinate repeatable imports with the backend lead to avoid duplicates. Include varied regions, statuses, organizations, and contact dates to exercise filters and dashboard behavior. Prefer deriving elapsed contact days from stored dates rather than maintaining stale counters.

## Verification and project defense

Run checks appropriate to the change and tools present. Documentation-only changes need content/diff review, not application tests. For integration, verify relevant CRUD, filtering, errors, and image behavior. Check persistence after restarting when a working desktop build is available. Report missing backend components or unavailable checks plainly.

Map actual Statement of Work requirements to features and evidence for the presentation. Identify incomplete features honestly. Prototype screens and fixture data do not establish persistence or security.

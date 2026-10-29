# Session handoff

Personal to Broughnut. Teammates and their agents need not read or maintain it.

Updated: October 29, 2026. Branch at this checkpoint: `dev`.
Recheck Git before acting; this document does not establish synchronization.

## Goal and preferences

Support Broughnut's bridge/integration role while teaching Rust from the beginning.
Explain syntax, file organization, compilation, tests, and decisions in small
steps. The user wants to speak intelligently about the code in the project defense.
Use `device-workflow.md` when moving between computers.
Keywords: `HANDOFF OUT` prepares/commits/pushes scoped session work;
`HANDOFF IN` safely synchronizes and restores context; `CHECKPOINT` saves local
context only. The user explicitly requested HANDOFF OUT for this checkpoint.
Handoffs are optional for all team members, with separate checkpoints. Do not
automatically offer or prompt for them; use only on explicit request or keyword.
Rust teaching preferences remain personal.

## Completed and verified

- Merged `josseline-backend` into `dev` at `9cd93d1` and pushed that commit.
- User reports Josseline's backend work is done; Connor's frontend green light
  is still pending. Do not interpret that as verified end-to-end integration.
- Installed Rust/Cargo 1.99.1 (Windows MSVC), Microsoft C++ Build Tools, and Windows
  SDK on the device used in this chat. The other device's tooling is unknown.
- Full locked backend suite passed: 27 tests, including three new file-backed
  workflows. Cargo formatting, runner syntax, and Git whitespace checks passed.

## Work included in this handoff

The handoff commit contains:

- `backend-prototype/tests/persistence_workflows.rs`: create/edit/archive across
  database reopen, combined filters/foreign keys, persisted admin/fresh session.
- `scripts/test-backend.ps1`: full suite or `-WorkflowsOnly` runner.
- `docs/rust-development.md`, README, and E2E plan updates.
- AGENTS opt-in pointer and the personal workflow/continuity documents.

No additional development work is pending locally beyond this handoff's files.
The checkpoint is included in the same commit as the changes above. Confirm the
commit is on origin/dev before resuming on the other device; an interrupted or
failed push does not establish synchronization. Machine-installed tools must
be set up separately on that device. Read `docs/broughnut-workflow.md` when
resuming Broughnut's session; no lesson has been completed yet.

## Limitations and open decisions

- Standalone backend exists; no runnable Tauri application scaffold is present.
  `TAURI_BRIDGE_EXAMPLE.rs` is reference code, not registered IPC.
- Frontend invokes `get_contractors` with `filterJson`; bridge example defines
  `list_contractors`. Frontend `name`/`organization` differ from backend
  `full_name`/`organization_name`. Resolve and document when integrating.
- Backend integration tests are not desktop E2E, app-restart, or UI evidence.
- Statement of Work has not been located; do not claim acceptance compliance.
- Archive exists; permanent deletion is not assumed to be a requirement.

## Next small step

Give a guided backend tour: Cargo.toml, Cargo.lock, src/lib.rs, src/main.rs,
modules, and tests. Trace one contractor operation into SQLite, explaining the
syntax. No Rust lesson or user understanding has been confirmed yet. Confirm
the user's readiness before advancing into the next substantial learning step.

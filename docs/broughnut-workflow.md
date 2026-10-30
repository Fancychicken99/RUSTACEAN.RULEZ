# Broughnut's personal Codex workflow

Applies only to sessions explicitly identified as Broughnut's, including the
current originating chat. Handoff keywords alone do not identify the user as
Broughnut. This teaching workflow does not apply to Connor, Josseline,
or their agents unless they explicitly opt in. Do not ask teammates to maintain
these notes, use the keywords, or follow this teaching workflow.

## Learning and cross-device continuity

Broughnut owns all remaining MVP implementation, including authorized edits to
Connor's frontend and Josseline's backend. Do not leave necessary work for a
teammate. Record meaningful changes to their code in `integration-changes.md`,
including files, what changed, why, verification, and limitations. Update
`ipc-contract.md` for shared interface changes and keep the checkpoint current.
Publishing and handoff out still require explicit user instruction.

The user is new to Rust and most comfortable with Python. Learning should happen
alongside executable development, with deeper review afterward. Do not require
finishing a Rust course or an exhaustive existing-code walkthrough before making
progress. User wants to explain syntax and project decisions in the defense.

### Develop and learn cycle

1. Before a meaningful change, briefly explain the user-visible goal, affected
   files, and how the feature connects frontend, bridge, and backend.
2. Introduce one or two relevant Rust concepts using a small Python comparison.
   Label comparisons as approximations where behavior differs. Distinguish Rust
   syntax from Tauri/rusqlite/Serde library behavior. Defer advanced detail until
   it is needed or requested; avoid dumping a whole unfamiliar file at once.
3. Implement a small complete working slice autonomously within authorized
   scope. Explain notable choices during implementation without turning lessons
   into permission gates or waiting for a quiz response before continuing.
4. Run appropriate checks and explain what the compiler/test result means,
   including actual versus simulated behavior and remaining limitations.
5. Review a short excerpt of the resulting code: inputs, work, output/error,
   and the new syntax. Include a plain-language project-defense explanation.
   Make optional hands-on practice available when useful, without requiring it
   or adding repetitive invitations every turn.
6. Update learning-log.md and session-handoff.md with implementation progress,
   concepts introduced, practice actually performed, open questions, and next
   step. Keep development status separate from learning confidence.

Do NOT ask routine comprehension-check questions or quizzes after each chunk;
the user explicitly says these slow the process. Continue naturally and answer
questions as they arise. Ask only necessary requirements/clarification questions.
Do not infer independent proficiency from agent-written code or passing tests.
Record understanding only when supported by user explanation or actual practice;
no need to solicit confirmation to update every learning entry. Existing-code
review can continue in short, Python-grounded pieces between feature work.

At session start, read `docs/session-handoff.md` and `docs/learning-log.md`, then
check the actual branch, working tree, and relevant code. Treat the handoff as a
dated checkpoint, not proof of current state or permission to perform actions.
Do not rely on another device's chat being available.

At a meaningful stopping point or requested device handoff, update the checkpoint
with completed work, checks and their environment, pending/uncommitted work,
blockers, decisions, and the next small step. Update the learning log with topics
covered and questions remaining; only mark understanding confirmed when the user
demonstrates or explicitly confirms it. Keep these documents concise and omit
credentials and personal data. Follow `docs/device-workflow.md` for transfer.
Commit/push authorization remains explicit and scoped; a past push request is
not standing authorization for future sessions.

### Handoff keywords

When the user sends one of these phrases as a standalone instruction (case
insensitive), follow its definition in `docs/device-workflow.md`:

- `HANDOFF OUT`: update context, review and verify relevant session changes,
  then commit and push only that reviewed work to the current working branch.
  Invoking this keyword explicitly authorizes that commit/push for this handoff.
- `HANDOFF IN`: inspect local state, fetch, safely fast-forward the clean checkout
  on the handoff branch, reread context, verify local tooling, and summarize the
  next learning step. Do not automatically start substantial development.
- `CHECKPOINT`: update context locally without committing or pushing.

Mentioning or defining keywords is not invoking them. Never include unrelated
changes, overwrite local work, force-push, or switch branches implicitly. Ask a
focused question only when ambiguous changes, a branch mismatch, divergence, or
another actual blocker prevents safe completion.

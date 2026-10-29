# Broughnut's personal Codex workflow

Applies only to sessions explicitly identified as Broughnut's, including the
current originating chat. Handoff keywords alone do not identify the user as
Broughnut. This teaching workflow does not apply to Connor, Josseline,
or their agents unless they explicitly opt in. Do not ask teammates to maintain
these notes, use the keywords, or follow this teaching workflow.

## Learning and cross-device continuity

The user is new to Rust and wants to explain its syntax, file structure,
compilation, and project decisions intelligently. Learning is part of delivery.
Before meaningful code changes, explain the purpose and file placement. Introduce
Rust concepts as they appear, distinguish language features from library APIs,
keep changes small, and explain compiler/test output. Afterward, walk through
important lines and offer a brief explanation suitable for the project defense.
Do not assume a concept is understood just because code using it exists.

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

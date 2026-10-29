# Continuing between laptop and desktop

This optional workflow is available to every team member for device changes,
new chats, or other useful context transfers. It requires no routine maintenance
from people who do not use it. Broughnut's Rust learning preferences remain
separate in `broughnut-workflow.md`; handoff keywords do not enable them for others.
Files shared through Git are visible to the team, not private storage.

Do not automatically offer, suggest, or prompt for a handoff, including after
completed work. Use this system only when the current user explicitly requests
a handoff/checkpoint or invokes a keyword. Do not message or notify teammates
about it. People who choose to use the system can consult these instructions.

## Selecting context

For Broughnut, use `docs/session-handoff.md` and `docs/learning-log.md`.
For a teammate, use their explicitly selected checkpoint or
`docs/handoffs/<member>.md` with their known name (for example, `connor.md` or
`josseline.md`). Create it only when they request a checkpoint/handoff. Do not
read or overwrite another person's personal learning notes. If a keyword is
invoked and the intended checkpoint cannot be inferred from the session or
branch, ask which member/checkpoint to use. Record branch, completed work,
checks/environment, pending changes, limitations, and next step. Learning logs
are optional and personal.

Git carries the code and these context documents between devices. Chat history
is not required. Only committed and pushed changes can be retrieved from the
remote; local notes, untracked files, installed tools, and build output do not
travel automatically.

## Keywords

Send the phrase by itself; capitalization does not matter. These are project
instructions for Codex, not built-in app commands or shell commands.

| Phrase | Action |
| --- | --- |
| `HANDOFF OUT` | Prepare context, review relevant session changes, run appropriate checks, commit that work, and push the current working branch. |
| `HANDOFF IN` | Safely fetch/pull, read the updated context, check local tooling, and summarize where to resume. |
| `CHECKPOINT` | Save context documents locally without commit or push. |

Using `HANDOFF OUT` is explicit authorization for its scoped commit and push;
no extra confirmation is needed when the intended files and branch are clear.
Before committing, inspect the diff for unrelated changes or sensitive content.
Stage specific files, preserve unrelated staged/unstaged work, and stop for a
focused question if ownership or scope is ambiguous. Never force-push. If checks
fail, report the failure and resolve it within scope; do not claim a verified
handoff or silently publish known failures. Record remaining limitations.

Update the handoff to describe the state being transferred, rather than leaving
a stale statement that the transferred files are still awaiting commit. Report
the resulting commit and whether push succeeded. If push fails, say clearly that
the other device cannot retrieve the new checkpoint yet.

`HANDOFF IN` starts with Git status and branch inspection before changing files.
Fetch origin. If local work exists, branches diverge, or the branch does not
match the checkpoint, preserve the checkout and explain the blocker. Otherwise
pull with `--ff-only`, then reread the updated instructions and context. Verify
local tooling; run relevant tests before claiming results on this device.
Summarize the next step and wait for the user to begin substantial development.

The keywords become available on another device once these instructions have
been committed, pushed, and pulled there. For the first transfer, use the full
startup prompt below if that checkout does not yet contain these definitions.

## Before leaving a device

1. Send `HANDOFF OUT`. Codex updates the selected checkpoint and any applicable
   personal learning log, reviews the
   relevant changes, and commits/pushes them under the authorization above.
2. Codex must not stage unrelated work or switch branches.
3. Confirm the push succeeded before continuing edits on the other device.

## Starting on the other device

Open this repository (clone it first if necessary). Use one device for edits at a
time. Send `HANDOFF IN`. If the keywords have not arrived yet, start a chat with:

> Read AGENTS.md and my selected handoff checkpoint. Inspect the
> branch and working tree. Fetch origin and, if this checkout is clean and on the
> handoff branch, pull with --ff-only. Stop and explain any divergence or local
> changes. Summarize where we left off, verify tooling on this device, and continue
> using my applicable workflow preferences.

Do not reset or overwrite local changes to force synchronization. If branches
diverge, inspect the commits and agree on reconciliation. Never assume the same
absolute repository path on both computers.

Install Rust and C++ tools separately on each Windows device using
`rust-development.md`. Run `scripts/test-backend.ps1` there before treating the
previous device's results as locally verified. Do not copy `.git`, Cargo caches,
`target`, or real application databases between devices as a synchronization
method.

## Context documents

- `AGENTS.md`: shared team roles and permissions, plus an opt-in pointer.
- `broughnut-workflow.md`: Broughnut's personal teaching and continuity rules.
- `session-handoff.md`: current checkpoint, pending work, and next step.
- `learning-log.md`: learning progress and questions.
- `rust-development.md`: setup, commands, and verified backend baseline.
- `e2e-test-plan.md`: desktop testing prerequisites and scenario backlog.

Update the checkpoint rather than maintaining a transcript of every chat.

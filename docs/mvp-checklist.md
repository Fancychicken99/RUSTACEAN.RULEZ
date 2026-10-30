# Proposed Sprint 1 MVP evidence checklist

Updated October 30, 2026. This maps the proposed revised SOW to current evidence;
it is not client approval, final security certification, or full-release acceptance.
This checklist accompanies the reviewed filter/import handoff after 3c027d8;
see checkpoint/change log and verify origin/dev for transfer state.

| Proposed MVP behavior | Evidence | Status |
| --- | --- | --- |
| Runnable Windows executable | Debug build and real WebView2 smoke test | Verified on development device; fresh-machine/release packaging pending |
| Local password setup/login/errors/protected access | Bridge tests and real UI setup/wrong/correct password/lock/restart | Verified for tested flows |
| Inactivity lock | UI timer/activity renewal, protected backend expiry test, UI manual/editor lock tests | Implemented; real full-duration/sleep/wake test pending |
| Browse/create/edit/archive contractor linked to organization | Real UI create organization/contractor, edit/restart, cancel/confirm archive/restart and read-only retained-row inspection | Verified for name/role/email/phone; transfer/status changes separate |
| Region filtering and clearing | Real SQLite command and UI match/no-match/clear, independent global totals | Verified; other geography fields not implemented |
| Useful errors and no fixture fallback | Real field validation; rollback tests; simulated UI request failures/reordering | Verified at these layers; simulated conditions labelled |
| 50+ synthetic persisted profiles | Versioned JSON has 60; explicit UI import/cancel/repeat/restart; edits/archives retained | Verified; six organizations/regions, four statuses, six skills and stored contact dates |
| Offline core UI | Local CSS/JS/fonts; original CDN hosts blocked; zero external HTTP(S) attempts in smoke | Verified under those test conditions; OS-network-disconnected launch pending |

Tests use fresh temporary databases, not ordinary app data. Sample import never
runs automatically. Direct SQLite in the UI smoke runner is read-only retention/
count inspection, not seed setup or behavior under test.

Before treating the proposed MVP as client-ready: confirm its scope/timeout with
the client, verify actual inactivity duration and sleep/wake behavior, launch with
OS networking disconnected, review UI scenarios manually, and document the exact
build/environment/prerequisites. End-user release/installer handling and final
macOS/Linux targets remain separate work. The SOW's Hope UI requirement still
needs explicit alignment evidence; Bootstrap packaging alone is not proof.

Run from repository root:

```powershell
.\scripts\test-backend.ps1
.\scripts\desktop.ps1 -Action Test
.\scripts\desktop.ps1 -Action Build
node scripts/test-desktop-smoke.cjs
```

See ipc-contract.md for supported inputs, desktop-development.md for storage and
isolation, data/README.md for repeatable sample semantics, and integration-changes.md
for affected files and reasons.

# RUSTACEAN.RULEZ

Student contractor CRM for Dr. Burchfield. The Windows Tauri executable now
opens the original Northstar layout with real local authentication, saved
contractor/organization lists, profile selection, and dashboard counts. Full
MVP contractor create/edit/archive and organization creation are connected;
SQLite region filtering and explicit repeatable import of 60 fictional profiles
are also connected. Remaining MVP acceptance checks are listed below.

## Repository layout

```text
frontend/
  index.html                  Connected CRM entry point
  integration.html            Earlier minimal integration screen (not default)
  contractor-profile.html     Earlier static profile fragment (not loaded)
  css/                        Application styles
  js/                         UI controllers and tauri-api.js IPC boundary
  vendor/                     Pinned Bootstrap assets, fonts, and licenses
  fixtures/demo-data.js        Archived prototype fixtures; not loaded by CRM
backend/
  Cargo.toml, Cargo.lock       Reusable secure_crm_backend package
  src/                        SQLite/auth/session modules and demo executable
  tests/                      Backend tests
data/                         Versioned fictional dataset and import notes
src-tauri/                    Native startup, shared state, registered commands
scripts/                      Build and verification commands
docs/                         Contracts, scope, development notes, change log
```

Broughnut owns all remaining MVP implementation across frontend/backend/bridge.
Record edits and their purpose in [integration-changes.md](docs/integration-changes.md)
and shared interfaces in [ipc-contract.md](docs/ipc-contract.md). Original teammate
ownership identifies existing work; it does not defer remaining implementation.

## Build and run

From PowerShell at the repository root:

```powershell
.\scripts\desktop.ps1 -Action Test
.\scripts\desktop.ps1 -Action Build
.\scripts\desktop.ps1 -Action Run
```

Build output: `src-tauri/target/debug/rustacean_crm.exe`. It can be launched
directly after building. Rust/C++ tooling is needed to build; Windows WebView2 is
needed to run. This is a debug executable, not a verified installer/release.
See [desktop development](docs/desktop-development.md) for setup, storage, test
isolation, inactivity behavior, and platform limitations.

A fresh database starts with password setup and then login. No automatic seed
or fixture fallback is used. Use Import fictional samples and confirm to add the
versioned sample dataset; repeat import preserves edits and archives. Opening the HTML directly in a browser shows a
backend-unavailable error; use the executable for real data.

## Verification

```powershell
.\scripts\test-backend.ps1
node scripts/test-desktop-smoke.cjs
```

The Windows smoke test drives the real executable with isolated SQLite and
checks setup/login/lock/restart, organization and contractor creation, edit and
archive across process restarts, duplicate-name organization identity, backend
validation, double-submit protection, and text-safe rendering. It also checks local assets
with the original CDN hosts blocked and no external HTTP(S) requests observed.
It also verifies backend region/no-match/clear, import cancel/repeat/restart and
preservation of edited/archived samples. Failure/retry and stale-response handling
use explicitly simulated UI failures.
See [the MVP checklist](docs/mvp-checklist.md), [sample dataset notes](data/README.md),
and [the E2E plan](docs/e2e-test-plan.md) for evidence and remaining acceptance.

## Current limits

Editing currently covers full name, role, email and phone; organization transfers
and status changes are separate pending workflows. Region filtering queries
SQLite; organization/status/search filters then narrow those returned records. Country/city filters are unavailable because the response lacks
those fields. Contact-history metrics and activity are marked unavailable rather
than fabricated. Media/native quick actions, skill/decay UI, full
inactivity-duration testing, OS-disconnected launch, release packaging, and
macOS/Linux verification remain pending. Existing Bootstrap styling is preserved;
formal Hope UI requirement alignment remains to be confirmed.

[The revised SOW](docs/statement-of-work.md) remains a proposal, not approved
scope or proof of compliance. Optional [device workflow](docs/device-workflow.md)
is used only on explicit request; Broughnut's learning notes are personal.

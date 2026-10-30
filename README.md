# RUSTACEAN.RULEZ

Student contractor CRM for Dr. Burchfield. The Windows Tauri executable now
opens the original Northstar layout with real local authentication, saved
contractor/organization lists, profile selection, and dashboard counts. Full
MVP create/edit/archive/filter/import workflows are still in progress.

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
or fixture fallback is used. Opening the HTML directly in a browser shows a
backend-unavailable error; use the executable for real data.

## Verification

```powershell
.\scripts\test-backend.ps1
node scripts/test-desktop-smoke.cjs
```

The Windows smoke test drives the real executable with isolated SQLite and
checks setup/login/lock/restart, empty and persisted records, organizations,
numeric profile routes, and text-safe rendering. It also checks local assets
with the original CDN hosts blocked and no external HTTP(S) requests observed.
Failure/retry and stale-response handling use explicitly simulated UI failures.
See [the E2E plan](docs/e2e-test-plan.md) for remaining acceptance scenarios.

## Current limits

Create/edit/archive and organization creation are not connected yet; creation
buttons are disabled rather than reporting false success. Region/organization/
status/search filters currently operate on the loaded list, not dedicated backend
filter commands. Country/city filters are unavailable because the response lacks
those fields. Contact-history metrics and activity are marked unavailable rather
than fabricated. Media/native quick actions, persisted synthetic import, full
inactivity-duration testing, OS-disconnected launch, release packaging, and
macOS/Linux verification remain pending. Existing Bootstrap styling is preserved;
formal Hope UI requirement alignment remains to be confirmed.

[The revised SOW](docs/statement-of-work.md) remains a proposal, not approved
scope or proof of compliance. Optional [device workflow](docs/device-workflow.md)
is used only on explicit request; Broughnut's learning notes are personal.

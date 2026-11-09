# RUSTACEAN.RULEZ

## Downloads

[![Download for Windows](https://img.shields.io/badge/Download-Windows_x64-0078D4?style=for-the-badge)](https://github.com/Fancychicken99/RUSTACEAN.RULEZ/releases/download/v0.2.0/Hippo-Harbor-CRM-0.2.0-Windows-x64-setup.exe)
[![Download for Mac](https://img.shields.io/badge/Download-macOS_universal-202020?style=for-the-badge)](https://github.com/Fancychicken99/RUSTACEAN.RULEZ/releases/download/v0.2.0/Hippo-Harbor-CRM-0.2.0-macOS-universal.dmg)

**Hippo Harbor CRM 0.2.0** — Windows x64 and macOS 13+ (Apple Silicon and Intel).
Open the Windows setup wizard, or open the Mac DMG and drag the app into Applications.
Offline Whisper is included; no coding tools are needed.

[Release notes and checksums](https://github.com/Fancychicken99/RUSTACEAN.RULEZ/releases/tag/v0.2.0) · [Installation guide](https://github.com/Fancychicken99/RUSTACEAN.RULEZ/blob/v0.2.0/docs/installation.md)

The Mac class build is ad-hoc signed, not notarized; first opening may require
approval in Privacy & Security. Save your recovery key during initial setup.

---

Hippo Harbor CRM is a student desktop contractor CRM for Dr. Burchfield. The MVP
has been demonstrated; current 0.2.0 work targets the full Sprint 2 submission.
It includes encrypted local workspaces/recovery, contractor and organization
editing, images, combined filters, tags/skills, contact and audit history,
archive/restore, encrypted portable transfer and reviewed offline dictation.

See [current verification](docs/final-submission-verification.md) for tests,
Windows package status and remaining Mac/manual acceptance. The earlier
[MVP build evidence](docs/mvp-build-evidence.md) documents older artifacts and
does not establish that the current final source passed on macOS.
Use the [final demonstration guide](docs/final-demo-guide.md) for the presentation.
For end users, follow the [Windows/macOS installation guide](docs/installation.md).

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

Broughnut owns remaining final implementation across frontend/backend/bridge.
Record edits and their purpose in [integration-changes.md](docs/integration-changes.md)
and shared interfaces in [ipc-contract.md](docs/ipc-contract.md). Original teammate
ownership identifies existing work; it does not defer remaining implementation.

## Build and run

From PowerShell at the repository root:

```powershell
npm ci
npm run prepare:voice
.\scripts\desktop.ps1 -Action Test
.\scripts\desktop.ps1 -Action Build
.\scripts\desktop.ps1 -Action Run
```

Build output: `src-tauri/target/debug/rustacean_crm.exe`. It can be launched
directly after building. Rust/C++ tooling is needed to build; Windows WebView2 is
needed to run. This is a debug executable, not a verified installer/release.
For the Windows release executable and offline-WebView2 installer, run `npm ci`
then `.\scripts\desktop.ps1 -Action Package`. On a Mac, use
`bash scripts/desktop.sh package`; see the distribution guide for prerequisites.
See [desktop development](docs/desktop-development.md) for setup, storage, test
isolation, inactivity behavior, and platform limitations.

A fresh workspace starts with password setup, recovery-key acknowledgement and
login. Save the recovery key privately. No automatic seed or fixture fallback is
used. Use Settings → Import sample records and confirm to add the
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
than fabricated. Media/native quick actions and skill/decay UI remain final-scope
work. Windows release/installer generation and release login-screen launch passed;
fresh-machine install, OS-disconnected use, full Mac UI and Linux verification remain
pending. The prior full-duration inactivity run passed; dual-clock expiry now
also has deterministic boundary tests. Actual sleep/wake still needs a check.
Official Hope UI CSS is packaged locally with its MIT license and no font CDN.

[The revised SOW](docs/statement-of-work.md) remains a proposal, not approved
scope or proof of compliance. Optional [device workflow](docs/device-workflow.md)
is used only on explicit request; Broughnut's learning notes are personal.

# RUSTACEAN.RULEZ

Student contractor CRM for Dr. Burchfield. The target is a native Rust/Tauri
desktop executable. A first Windows Tauri executable now supports real local
administrator setup, login/logout, and protected SQLite contractor retrieval.
The original CRM dashboard is still a separate frontend prototype.

## Repository layout

```text
frontend/
  index.html                  Browser prototype entry point
  integration.html            First connected executable screen
  contractor-profile.html     Static profile fragment
  css/                        Page styles
  js/                         UI scripts and tauri-api.js IPC boundary
  fixtures/demo-data.js        Explicit fictional prototype data
backend/
  Cargo.toml, Cargo.lock       Rust package and locked dependencies
  src/                        Reusable backend modules and demo executable
  tests/                      Backend integration tests
docs/
  ipc-contract.md             Initial command/data contract and implementation status
  statement-of-work.md         Proposed revised scope and acceptance criteria
  backend-handoff.md          Backend reference notes; verify against current code
  reference/                  Uncompiled Tauri bridge example
scripts/                      Development and verification commands
src-tauri/                    Native executable startup, shared state, commands
```

Connor's UI work belongs in `frontend/`; Josseline's SQL and persistence belong
in `backend/`. Broughnut's JavaScript IPC boundary is
`frontend/js/tauri-api.js`. Tauri startup, state, and command registration
live in root `src-tauri/`, depending on the backend library by local path.
Broughnut owns all remaining MVP work across these layers and records edits in
[the integration change log](docs/integration-changes.md). The Rust backend package remains
named `secure_crm_backend`; only its directory changed from `backend-prototype`.

## Frontend preview and integration status

Open `frontend/index.html` for the existing browser prototype. Paths are relative
to that page. The explicit fixture script loads before the page controller;
fixtures are not a backend fallback or a repeatable database import. Store future
reusable database seed files in a dedicated `data/` directory when introduced.

`frontend/integration.html` loads `frontend/js/tauri-api.js` and calls real
commands in the executable. The original index page does not use it yet.
The wrapper returns promises and errors without rendering. See
[the IPC contract](docs/ipc-contract.md). Only frontend/ is embedded as webview
assets, not the whole repository. The integration page uses local assets only;
the original prototype still has the limitations below.

Existing limitations: Bootstrap assets still use CDN URLs; referenced images and
logos are absent; the standalone profile file is a fragment; the lock script uses
demo credentials. Local asset packaging, real authentication, fixture removal,
and connected data rendering remain integration work. Previewing these screens
does not verify offline operation, persistence, or security.

The optional [handoff workflow](docs/device-workflow.md) is available to any team
member. Broughnut's personal Rust learning preferences remain separate.

## Testing

The goal is a runnable MVP by the end of Sprint 1. An initial real-executable
smoke test covers setup/login/lock, empty results, and persisted credentials after
restart; this does not establish the full CRM MVP. See
[the E2E test plan](docs/e2e-test-plan.md) for prerequisites, team responsibilities,
and scenarios. Full CRM scenario coverage remains pending.
Rust backend tests and persistence workflows are available; see
[Rust development](docs/rust-development.md) for setup and commands.

Build/run the first executable and its smoke test using
[desktop development instructions](docs/desktop-development.md).

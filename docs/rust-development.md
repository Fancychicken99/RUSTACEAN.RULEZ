# Rust development on Windows

The Rust crate is `backend-prototype`, using edition 2024 and bundled SQLite.
There is no Tauri application scaffold yet. The bridge example is reference code,
not a compiled or registered IPC implementation.

## Setup

Install Rustup and Microsoft C++ Build Tools with the C++ workload and Windows SDK.
Bundled SQLite needs a C compiler in addition to Rust's linker.

```powershell
winget install --id Rustlang.Rustup --exact --source winget
winget install --id Microsoft.VisualStudio.2022.BuildTools --exact --source winget --override '--wait --passive --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended'
```

Finish installer prompts and open a fresh terminal. Verify `rustup show`,
`rustc --version`, and `cargo --version`. Use the native MSVC toolchain.
Official prerequisites: https://rust-lang.github.io/rustup/installation/windows-msvc.html

## Checks from the repository root

```powershell
.\scripts\test-backend.ps1
.\scripts\test-backend.ps1 -WorkflowsOnly
cargo fmt --manifest-path backend-prototype/Cargo.toml -- --check
```

The script finds Cargo in the default user installation even before this shell's
PATH updates. Failed tests stop the script. `--locked` preserves dependency
versions; record resolution errors before changing dependencies.

`tests/persistence_workflows.rs` uses a fresh temporary directory per test and
real backend functions. It checks create/read/edit/archive across database
closes, combined region/skill filtering, foreign-key rejection, and persisted
admin credentials with a fresh unauthenticated session after reopen. Archive is
the implemented operation; permanent deletion is not assumed. `tempfile` cleans
up only the directories it creates. No application database is opened or reset.

These are backend integration tests, not desktop E2E tests. Closing and reopening
SQLite does not verify application restart, IPC, UI, or image display. See
`e2e-test-plan.md` for those prerequisites. Do not use `cargo run` to seed tests:
the demonstration program has a separate database and is not an isolated runner.

## Verified baseline — October 29, 2026

On Windows with Rust/Cargo 1.99.1 (MSVC), the full locked backend suite passed:
27 tests, including the three new persistence workflows. `cargo fmt -- --check`
and the PowerShell runner's syntax check also passed. Desktop E2E remains blocked
by the missing Tauri application, registered commands, and connected UI.

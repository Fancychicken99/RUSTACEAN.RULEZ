# Windows and macOS MVP delivery

Updated October 31, 2026. Broughnut requires the MVP on both platforms. The
functional scope is the seven acceptance checks in statement-of-work.md; final
release features such as media, transfers/history and native communication
handoffs remain separate. This document does not claim client acceptance.

## Files for the person running the demo

| Platform target | File | Runtime prerequisites |
| --- | --- | --- |
| Windows 10/11, x64 | `src-tauri/target/release/rustacean_crm.exe` or `src-tauri/target/release/bundle/nsis/Rustacean CRM_0.1.0_x64-setup.exe` | WebView2; setup includes its offline installer. Standalone exe needs an existing compatible WebView2 installation. |
| macOS 13+, Apple Silicon or Intel | `src-tauri/target/universal-apple-darwin/release/bundle/macos/Rustacean CRM.app` in a metadata-preserving ZIP, or the DMG under `bundle/dmg/` | Built-in WKWebView. No Rust/Cargo/Node runtime. Actual OS/hardware acceptance still required. |

Both platforms were built successfully by native CI from 9c41b18. See
mvp-build-evidence.md for downloads, local package paths and exact checks.
The table above describes build-machine outputs. Do not rename
an exe to app or copy a Windows binary to a Mac. Keep the whole .app bundle.

Both builds embed HTML/CSS/JavaScript and the fictional dataset. User databases
stay outside the executable in the OS application-data directory for
`edu.rustacean.crm`. Updating the executable does not import samples, reset data
or remove archived records. Release builds ignore RUSTACEAN_TEST_DATA_DIR.

Windows builds are unsigned. macOS uses an ad-hoc signature, not an Apple
Developer ID or notarization. A downloaded demo may need explicit approval in
the OS security UI; do not disable system-wide security settings. A locally
built Mac bundle avoids the browser download quarantine path. Seamless public
distribution requires separate signing/notarization credentials and testing.

## Build on Windows

Build-time prerequisites: Rust/Cargo 1.99.1 MSVC, C++ Build Tools, Node with npm,
and internet for the initial package/tool downloads. From the repository root:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
.\scripts\test-backend.ps1
.\scripts\desktop.ps1 -Action Test
.\scripts\desktop.ps1 -Action Build
node scripts/test-desktop-smoke.cjs
.\scripts\desktop.ps1 -Action Package
```

The installer includes the WebView2 offline installer; it is intentionally much
larger than the standalone executable. Building requires downloads even though
the installed core CRM is intended to work offline. Installing/provisioning
WebView2 on a fresh disconnected machine still needs an observed acceptance run.

## Build on a Mac

Build-time prerequisites: Xcode Command Line Tools (`xcode-select --install`),
Rust/Cargo 1.99.1, and Node.js with npm. These are for the build machine only.
From the repository root on the Mac:

```bash
rustup toolchain install 1.99.1 --profile minimal
rustup override set 1.99.1
bash scripts/desktop.sh test
bash scripts/desktop.sh package
open "src-tauri/target/universal-apple-darwin/release/bundle/macos/Rustacean CRM.app"
```

The package command installs both Rust targets and combines arm64/x86_64.
To transfer the bundle while preserving metadata:

```bash
ditto -c -k --sequesterRsrc --keepParent \
  "src-tauri/target/universal-apple-darwin/release/bundle/macos/Rustacean CRM.app" \
  "Rustacean-CRM-macos-universal.zip"
```

No teammate implementation is needed. Broughnut owns any fixes exposed on the
Mac; its owner only supplies access or runs acceptance scenarios.

## Automated native builds

`.github/workflows/desktop-builds.yml` runs on pushes to dev, or manual dispatch
where GitHub makes that trigger available. Each native runner installs pinned
tools, tests backend/bridge, and builds release packages. Windows also runs the
real debug UI smoke. macOS verifies universal architectures and code signature,
and checks that the packaged process stays alive for ten seconds; this is not a
full macOS UI test. Artifacts include a .app ZIP/DMG or Windows exe/setup.

After an authorized push, inspect the workflow under GitHub Actions and download
its artifacts. Artifact download requires appropriate repository access. This
workflow uploads build artifacts, not a public GitHub Release. It has read-only
repository permissions and no signing secrets. Before its first successful run,
the workflow is prepared configuration, not evidence of a successful Mac build.

## Client demonstration and acceptance (both operating systems)

Record the OS, processor, build/hash, scenario results and any errors.

1. Launch from the native package. On a new demo database create a password of
   at least 12 characters, then try incorrect and correct login.
2. Choose Import fictional samples and confirm: expect 60 contractors and six
   organizations on a fresh database. Repeat: expect no duplicates. Existing
   manual records or archives can change the visible total.
3. Browse a profile. Filter East Nairobi (ten samples before any archive), choose
   an empty region, then clear. Dashboard totals remain global.
4. Create a fictional organization and contractor, edit name/role/email/phone,
   close/reopen and confirm the saved values.
5. Cancel an archive, then confirm it; close/reopen and confirm the row is absent
   from the directory. Archive retains the database row.
6. Lock; confirm lists/editors clear and protected actions require login. Check
   the normal 15-minute inactivity period and actual sleep/wake behavior.
7. Close the CRM, disconnect system networking, relaunch and repeat browse,
   create/edit and restart. Restore networking afterward. All UI assets must
   load locally. No network change is performed by the automated test scripts.

Do not use real contractor information. Any manual records created during the
demo remain until explicitly archived; never reset an ordinary user database.

## Current evidence and remaining acceptance

Windows: 35 backend tests, four bridge tests, locked release/debug compilation,
installer generation, and real debug UI CRUD/filter/import/restart checks passed.
Hope UI screenshot inspected; no external HTTP(S) requests or CSP errors in smoke.
Four deterministic session tests cover sleep-like wall elapsed, backward clock,
monotonic expiry and non-renewing status reads. These do not simulate an actual
OS sleep. The prior real 900.38-second inactivity pass preceded the dual-clock
change; the updated code has automated boundary/regression coverage.

Native builds, Mac signature/architecture/process launch and Windows release
startup now passed; see mvp-build-evidence.md. Pending: Mac UI use; downloaded Mac package
approval; release/fresh-machine install and full CRUD; actual sleep/wake and
OS-network-disconnected runs on both platforms. macOS 13 and Windows 10 are
configured targets, not claims of testing on those oldest OS releases.

References: [Tauri macOS bundles](https://v2.tauri.app/distribute/macos-application-bundle/),
[Windows installer/WebView2](https://v2.tauri.app/distribute/windows-installer/),
[macOS signing](https://v2.tauri.app/distribute/sign/macos/),
[Rust clock behavior](https://doc.rust-lang.org/std/time/struct.Instant.html).

# Final submission verification — November 7, 2026

The MVP has already been demonstrated. Current work targets the full Sprint 2
submission, version 0.2.0. This document supersedes older MVP-only completion
statements; implementation is distinct from platform acceptance.

## Verified backend and bridge

- All 49 backend tests passed with the actual SQLCipher provider.
- All six bridge/voice tests passed, including actual offline transcription using
  the pinned Whisper runtime and multilingual base model.
- Encrypted database creation, reopening, password change/recovery, plaintext
  migration and explicitly confirmed original-copy cleanup were exercised in
  isolated temporary workspaces. Ordinary application data was not migrated.
- Encrypted portable export/import includes database records and linked media.
  Wrong passwords and cancelled import preserve the target. Import replaces the
  workspace after native confirmation, retains an encrypted backup, and provides
  a new recovery key. It does not merge workspaces.
- Combined Soundex/text/geography/status/taxonomy/contact-age queries, audit
  history, archival/restoration and persisted images have backend coverage.

Logs are generated under src-tauri/target/final-backend-tests.log and
final-bridge-tests.log; they are local ignored artifacts, not Git deliverables.

## Platform verification

The final Windows release executable and 338.85 MiB NSIS installer were generated
successfully from the corrected source. A compiled
executable alone does not establish installed-build acceptance. Distribute the
setup installer: copying the loose executable alone omits required voice resources.

Focused real-WebView2 regression passed: bounded logo, country-derived telephone
formatting, actual PNG upload/protected display and address persistence across
restart, taxonomy UI persistence, and ten axe scans (login, contractor form,
profile, record tools and Settings, each in light and dark themes). These scans
have zero WCAG-tagged violations; incomplete/manual findings are retained in JSON.
Light profile and dark Settings screenshots were visually reviewed. The final
full real-WebView2 suite PASSED against the corrected debug build: CRUD,
validation/double-submit protection, organization/inline creation, edit/restart,
archive/cancel/restart retention, duplicate organization IDs, authentication/lock,
sample import/cancel/repeat, filtering and international caret/delete/persistence.
Injected frontend failure/order/late-after-lock scenarios are explicitly simulated;
ordinary CRUD and persistence use actual IPC and SQLCipher. No unexpected browser
errors, CSP violations or external HTTP(S) requests were observed.

Retained isolated artifacts on this Windows device:
C:\Users\Brody Mensonides\AppData\Local\Temp\rustacean-desktop-smoke-QCQXdq.
They contain synthetic test records/screenshots and ten accessibility JSON reports;
they are not committed. Manual accessibility and clean-device/platform acceptance
remain separate from this passing suite.

A fake WebView microphone exercised actual audio capture/WAV conversion. A
simulated transcript verified no automatic insertion/save and explicit reviewed
insertion. This does not prove physical microphone capture or recognition quality;
the separate real engine test verifies bundled speech recognition on a pinned sample.

The native CI workflow prepares bundled voice resources, tests Rust, and builds
Windows x64 and macOS universal packages. Current source has not yet been pushed;
there is no current macOS artifact or native macOS acceptance result. Local
Windows tests cannot establish microphone permissions, universal binary behavior,
Gatekeeper behavior or UI operation on macOS. Draft-SOW Linux delivery remains an
explicit unresolved target; no Linux completion claim is made.

## Required final checks

- Full Windows debug UI regression: passed.
- Optimized Windows release startup: passed. It opened the locked authentication
  screen without login/setup/import or ordinary-record changes; no external
  HTTP(S) request was observed. Screenshot directory ends in smoke-iwQZEd.
- Review axe WCAG 2.2 AA-tagged results and incomplete/manual checks. Automated
  scans do not establish complete WCAG conformance; keyboard, focus, zoom,
  screen-reader and platform checks still require evidence.
- Windows NSIS generation, bundled model/runtime declarations and release startup:
  passed. Fresh installation/update and installed-feature testing remain separate.
- Build on native macOS CI after authorized commit/push, then perform Mac UI,
  microphone and portable-transfer acceptance with the available Mac owner.
- Exercise actual microphone capture/review and native file pickers. A successful
  engine sample test does not establish hardware capture end to end.

## Security and delivery boundaries

The database uses SQLCipher. Password/recovery wrappers and portable archives use
authenticated encryption. Active filesystem images remain ordinary local files;
database encryption does not encrypt those images. Old encrypted import backups
and recovery material must be protected. There is no certification claim.

Portable transfer is bounded to a 16 MiB database, 32 MiB linked media and a
64 MiB archive. Images accept PNG/JPEG input up to 8 MiB and 4096 by 4096 pixels,
are normalized to PNG, and are loaded through authenticated record identifiers.
This is a student desktop CRM, with no petabyte storage claim.

Release builds use bundled resources and do not download a voice model at runtime.
Node, Cargo and Perl are build tools, not end-user requirements. Windows needs
WebView2 (included through the offline-installer packaging configuration). macOS
builds are ad-hoc signed; Developer ID notarization has not been established.

Release executable SHA-256 (diagnostic, distribute the installer with resources):
71d7187bcedf70777623d32b0431238a4f6721732c796ae7703b6c9dc3164923.

Final local Windows deliverable:
src-tauri/target/release/bundle/nsis/Hippo Harbor CRM_0.2.0_x64-setup.exe
(355,313,350 bytes).
Installer SHA-256:
50933fd7519f58d92a19202543425d4f4e6d128b76d7e7eab05b0cdd35d2f75a.
This ignored build output does not travel through a source Git commit; native CI
uploads the installer after an authorized push. It has not been published here.

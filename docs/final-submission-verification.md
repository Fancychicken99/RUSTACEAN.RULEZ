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

Source 4cf8cec is published on dev. Native
[run 42373955371](https://github.com/Fancychicken99/RUSTACEAN.RULEZ/actions/runs/42373955371)
passed backend and bridge/voice tests on both Windows and macOS. The clean Windows
runner also passed the full executable UI regression. The Mac job SUCCEEDED:
universal .app and DMG generated, arm64/x86_64 architectures checked, deep/strict
ad-hoc signature verified, and packaged process alive after ten seconds. The
Windows CI release-package build is still running; the local Windows installer
and release startup already passed. Mac tests include bundled-engine transcription; these
do not establish physical microphone permissions, Gatekeeper acceptance or Mac UI
operation. Draft-SOW Linux delivery remains an explicit unresolved target; no
Linux completion claim is made.

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
- Native macOS build/package, architecture, signature and process checks: passed.
  Perform full Mac UI, microphone and portable-transfer acceptance on the available
  Mac; neither Intel hardware execution nor macOS 13 execution was tested here.
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

## Ready-to-install delivery folder

Both installers and the install guide are available locally in
src-tauri/target/installers/. The files are generated/ignored, not Git source:

| Platform | File | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Windows x64 | Hippo Harbor CRM_0.2.0_x64-setup.exe | 355313350 | 50933fd7519f58d92a19202543425d4f4e6d128b76d7e7eab05b0cdd35d2f75a |
| macOS universal | Hippo Harbor CRM_0.2.0_universal.dmg | 158510026 | bb031578be20ca5b26aa6f647a6e954e9bff989638b02f87fb41536e5b759e2a |

[Mac CI download](https://github.com/Fancychicken99/RUSTACEAN.RULEZ/actions/runs/42373955371/artifacts/13575700414)
contains the DMG and a metadata-preserving ZIP of the .app. The downloaded outer
artifact ZIP was verified against GitHub's upload digest
51d07aed0fbdd1bd69e6625e017a7e4a8e8ccd5c9e0e0f580fe87f66e4a89071.
The DMG was copied unchanged into the delivery folder. See installation.md for
Windows setup, Mac drag-to-Applications and the ad-hoc signing/first-open boundary.

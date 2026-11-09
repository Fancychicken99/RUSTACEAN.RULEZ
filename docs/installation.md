# Install Hippo Harbor CRM

Use the installers for version 0.2.0 from the final native build. Older MVP
artifacts contain older functionality. Build evidence and final download links
are recorded in final-submission-verification.md.

## Windows x64

1. Open Hippo Harbor CRM_0.2.0_x64-setup.exe.
2. Follow the setup wizard, then open Hippo Harbor CRM from the Start menu.
3. On first use, create a password and save the one-time recovery key privately.

The installer includes the offline WebView2 prerequisite and the local speech
model/runtime. No Rust, Cargo, Node, Python or development environment is needed.
Distribute the setup file rather than copying the loose executable.

## macOS 13 or later — Apple Silicon and Intel

1. Open the Hippo Harbor CRM .dmg disk image.
2. Drag Hippo Harbor CRM.app to Applications.
3. Open it from Applications, create a password and save the recovery key.
4. Allow microphone access when you choose the microphone button for speech to text.

The universal app contains both CPU architectures and the offline speech model.
Do not unpack and re-zip the app on Windows: Mac permissions and bundle metadata
must be preserved. Transfer the DMG or the CI-created macOS ZIP unchanged.

This class-submission build is ad-hoc signed, not Developer ID notarized. macOS
may block the first opening. Review the app/source/checksum before deciding whether
to use the per-app Open Anyway control in System Settings → Privacy & Security.
See [Apple's opening guidance](https://support.apple.com/en-us/102445). Do not
disable Gatekeeper globally. A standard verified-developer opening experience
requires Apple Developer signing/notarization credentials; none are configured.

## First use and moving records

Settings offers an explicit sample import using entirely synthetic records.
There is no default password or automatic sample import. Password recovery uses
the saved recovery key and preserves the records; losing both prevents recovery.

To move records between computers, use Settings → Move a workspace between
devices. Export a password-encrypted .hharbor file, then import it on the target.
Import replaces that workspace after confirmation and retains an encrypted backup.
It provides a new recovery key and uses the new login password entered for import.
Do not copy only a database file: its manifest and key material are required.

Installation and full installed-device acceptance are distinct. Native build,
signature/architecture and process-start checks are supporting evidence; physical
microphone, file pickers, fresh installation/update and Mac UI acceptance remain
listed separately in final-submission-verification.md.

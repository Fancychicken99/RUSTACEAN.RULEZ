# Native MVP build evidence — October 31, 2026

Source: `9c41b187190207b0c808387362958cfd51c32033`.
[Run 41226249859](https://github.com/Fancychicken99/RUSTACEAN.RULEZ/actions/runs/41226249859):
both native jobs concluded **success**.

| Check | Windows hosted runner | macOS 15 hosted runner |
| --- | --- | --- |
| Exact-byte UI integrity | Passed | Passed |
| Backend and bridge tests | 35 + 4 passed | 35 + 4 passed |
| Full real debug UI CRUD/filter/import/lock/restart smoke | Passed | Not run; CDP runner is Windows-specific |
| Optimized packages | exe + NSIS setup built | Universal .app + DMG built |
| Packaged startup | Release exe opened locked authentication UI | Packaged process stayed alive ten seconds |
| Mac architecture/signature | Not applicable | arm64/x86_64 and ad-hoc signature verified |

Windows setup embeds the WebView2 offline installer. This is package-generation
evidence, not a fresh disconnected install. Mac ad-hoc signing is not Apple
notarization. Intel code is included and verified, not executed on a physical
Intel Mac in this run. Full downloaded Mac UI use still needs observation.

## Downloaded packages

Both archive downloads matched GitHub's SHA256 before extracting package files
into ignored build output. No binaries or user databases are committed to Git.

Windows: [artifact 13052068697](https://github.com/Fancychicken99/RUSTACEAN.RULEZ/actions/runs/41226249859/artifacts/13052068697),
archive SHA256 `072dab19234aae11e3da7ba6110902398cb0bbb3e6232accceb72e5df1cae2b2`.
Local directory: `src-tauri/target/distribution/windows-9c41b18/`.
Contains rustacean_crm.exe and bundle/nsis/Rustacean CRM_0.1.0_x64-setup.exe.

Mac: [artifact 13051054292](https://github.com/Fancychicken99/RUSTACEAN.RULEZ/actions/runs/41226249859/artifacts/13051054292),
archive SHA256 `fd1820e8e0c8e0750804867276435763813cc11eb8aa8aaf7d11b23408c82494`.
Local directory: `src-tauri/target/distribution/macos-9c41b18/`.
Contains the metadata-preserving app ZIP and dmg/Rustacean CRM_0.1.0_universal.dmg.
Keep the .app inside its ZIP/DMG when transferring from Windows to Mac.

Artifacts require repository access and are subject to GitHub retention. Exact
runtime/build prerequisites and demo steps are in mvp-distribution.md.

## Remaining acceptance

Pending: full Mac UI CRUD/filter/import/restart; OS-network-disabled launch/use;
actual sleep/wake; fresh-machine installation and full release CRUD. The prior
900.38-second awake inactivity pass predates the dual-clock change; current
session logic has deterministic boundary/regression tests. No client acceptance,
formal security, notarization or Linux completion claim.

Earlier runner retirement, lipo argument-order, elevated WebView2 debugging and
Windows checkout/SRI problems were corrected before the successful run. See
integration-changes.md. Mutation smoke used disposable databases. CI-only
debugging policy was scoped to the executable and removed after process stop.

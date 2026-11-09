# Hippo Harbor CRM branding

November 4, 2026. The user selected the navy-and-teal hippo tugboat logo with
hippo faces replacing both O letters in HIPPO HARBOR, and authorized applying
the branding, committing, and pushing this chat's changes.

## Assets and surfaces

- `frontend/assets/branding/hippo-harbor-logo.png`: approved full logo, including
  both hippo-face O letters. Retained as the approved full-logo asset.
- `frontend/assets/branding/hippo-harbor-mark.png`: generated transparent,
  text-free emblem derived from that logo for native icons and the favicon.
  The November 6 conflict resolution retains the current branch's compact mark
  with visible Hippo Harbor CRM text on authentication and sidebar navigation.
  It removes duplicated conflict alternatives, not the approved artwork files.
- `src-tauri/icons/icon.png`, `icon.ico`, and `icon.icns`: Linux/Windows/macOS
  exports from the mark. The old placeholder SVG is retired.

Assets were generated using the imagegen skill, then stored locally so branding
does not require remote assets. Full-logo artwork has its original light
background, retained in dark mode for contrast. Images have accessible names;
the authentication screen retains a text heading for assistive technology.

To regenerate native exports with Python 3 and Pillow installed:

```text
python scripts/generate-brand-icons.py
```

Pillow is only an optional developer asset-export tool, not a build or end-user
runtime dependency. Exported icons are checked in. Artwork is raster PNG, not
an editable vector master.

## Compatibility and naming

The display name, window title, footers, reference integration page, installer
product name, and macOS CI paths use Hippo Harbor CRM. Internal Rust crate and
binary names, `edu.rustacean.crm`, environment variable names, and database paths
stay stable so a cosmetic rename does not relocate existing user data or break
the existing executable test runner. No IPC or database schema changes.

The same packaged frontend and PNG/ICO/ICNS assets apply across the existing
platform targets. Windows/macOS native CI remains the packaging check. Linux
still needs its final platform build/device acceptance; an icon is not evidence
that a platform is verified. Existing download links and old build evidence
retain historical package names until new packages are available.

Whisper remains unimplemented pending the input-field inventory described in
[the voice-input plan](voice-input-plan.md).

## Local verification

- Packaged UI integrity check and JavaScript syntax check passed.
- PNG, ICO, and ICNS files reopened and verified with Pillow; main PNG is square
  RGBA at 1024 pixels. ICO includes small Windows icon sizes.
- Browser-only layout previews loaded local branding in light/dark themes and
  at a 375-pixel authentication viewport without horizontal overflow. Visibility
  and authentication text were simulated for layout review; this was not IPC or
  executable verification.
- This device lacks Rust/Cargo, so native compilation, installed icon rendering,
  and Windows/macOS upgrade behavior require CI and device checks. No native
  acceptance is claimed by these previews. Existing installations must be checked
  for upgrade behavior after the installer product-name change.

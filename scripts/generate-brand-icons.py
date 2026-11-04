"""Export desktop icon formats from the approved mark (developer tool: Pillow)."""

from pathlib import Path

from PIL import Image, ImageOps


root = Path(__file__).resolve().parents[1]
source = root / "frontend/assets/branding/hippo-harbor-mark.png"
destination = root / "src-tauri/icons"
destination.mkdir(parents=True, exist_ok=True)

with Image.open(source) as image:
    # Native icon containers require square images; retain the entire emblem.
    icon = ImageOps.pad(image.convert("RGBA"), (1024, 1024),
                        method=Image.Resampling.LANCZOS, color=(0, 0, 0, 0))
    icon.save(destination / "icon.png")
    icon.save(destination / "icon.ico", format="ICO",
              sizes=[(size, size) for size in (16, 24, 32, 48, 64, 128, 256)])
    icon.save(destination / "icon.icns", format="ICNS")

print("Exported PNG (Linux), ICO (Windows), and ICNS (macOS) icons.")

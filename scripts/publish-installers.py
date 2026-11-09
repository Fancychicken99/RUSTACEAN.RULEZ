"""Manual CI publisher: release only installers from a successful native run."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


def gh(*arguments, payload=None):
    result = subprocess.run(
        ["gh", *arguments], check=True, text=True, capture_output=True,
        input=json.dumps(payload) if payload is not None else None,
    )
    return result.stdout


def api(endpoint, method="GET", payload=None):
    arguments = ["api", endpoint, "--method", method]
    if payload is not None:
        arguments += ["--input", "-"]
    return json.loads(gh(*arguments, payload=payload))


def publish():
    repo = os.environ["RELEASE_REPO"]
    run_id = os.environ["RELEASE_RUN_ID"]
    sha = os.environ["RELEASE_SOURCE_SHA"]
    version = os.environ["RELEASE_VERSION"]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise ValueError("Invalid repository")
    if not run_id.isdecimal() or not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("Invalid source run or commit")
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
        raise ValueError("Invalid release version")
    base = f"repos/{repo}"
    run = api(f"{base}/actions/runs/{run_id}")
    if (run["status"] != "completed" or run["conclusion"] != "success"
            or run["head_sha"] != sha or run["head_repository"]["full_name"] != repo
            or run["path"] != ".github/workflows/desktop-builds.yml"):
        raise ValueError("Native build must succeed for this exact repository and commit")
    configured = json.loads(Path("src-tauri/tauri.conf.json").read_text())
    if configured["version"] != version:
        raise ValueError("Version does not match the built source")
    tag = "v" + version
    releases = api(f"{base}/releases?per_page=100")
    existing = next((item for item in releases if item["tag_name"] == tag), None)
    if existing and not existing["draft"]:
        raise ValueError("Published release is immutable; use a new version")
    if existing and existing["target_commitish"] != sha:
        raise ValueError("Existing draft targets different source; refusing to overwrite")
    download = Path("release-artifacts")
    download.mkdir(exist_ok=True)
    gh("run", "download", run_id, "--repo", repo, "--pattern", "Hippo-Harbor-CRM-*", "--dir", str(download))
    windows = list(download.rglob("*-setup.exe"))
    mac = list(download.rglob("*.dmg"))
    if len(windows) != 1 or len(mac) != 1:
        raise ValueError("Expected exactly one Windows installer and one Mac DMG")
    output = Path("release-assets")
    output.mkdir(exist_ok=True)
    for source, name in [(windows[0], "Hippo-Harbor-CRM-Windows-x64-setup.exe"),
                         (mac[0], "Hippo-Harbor-CRM-macOS-universal.dmg")]:
        if version not in source.name:
            raise ValueError("Artifact filename does not match version")
        (output / name).write_bytes(source.read_bytes())
    (output / "INSTALL.md").write_bytes(Path("docs/installation.md").read_bytes())
    hashes = {}
    for file in output.iterdir():
        if file.is_file():
            with file.open("rb") as stream:
                hashes[file.name] = hashlib.file_digest(stream, "sha256").hexdigest()
    (output / "SHA256SUMS.txt").write_text("".join(f"{digest}  {name}\n" for name, digest in sorted(hashes.items())))
    hashes["SHA256SUMS.txt"] = hashlib.sha256((output / "SHA256SUMS.txt").read_bytes()).hexdigest()
    notes = Path("release-notes.md")
    notes.write_text(f"""Hippo Harbor CRM {version}

## Download and install
- Windows x64: open **Hippo-Harbor-CRM-Windows-x64-setup.exe** and follow setup.
- macOS 13+ (Apple Silicon and Intel): open **Hippo-Harbor-CRM-macOS-universal.dmg** and drag the app into Applications.
- Offline Whisper and its model are included. No coding tools are required.
- Create a local password and save your recovery key privately during setup.

This update fixes organization custom-field layout and carries forward the merged CRM workflows, archive and change-history features, company Out of Business status, and tested upgrades for existing workspaces without discarding records. Portable imports support schemas 6 and 7.

Both native build jobs succeeded, including backend and bridge/Whisper tests, Windows executable UI regression and release startup, and Mac universal architecture/signature/process checks. [Build evidence](https://github.com/{repo}/actions/runs/{run_id}). Built commit: `{sha}`.

Windows remains unsigned and can show SmartScreen. Mac is ad-hoc signed, not Developer ID notarized, and can require first-open approval. Full installed-device, physical microphone, Mac UI and manual accessibility acceptance remain separate. Local image files are not encrypted by database encryption. Linux is not included.

See INSTALL.md and SHA256SUMS.txt. Installer asset names remain stable so homepage buttons can follow the latest release.
""")
    if not existing:
        gh("release", "create", tag, "--repo", repo, "--draft", "--target", sha,
           "--title", f"Hippo Harbor CRM {version}", "--notes-file", str(notes))
    else:
        gh("release", "edit", tag, "--repo", repo, "--notes-file", str(notes))
    gh("release", "upload", tag, "--repo", repo, "--clobber", *map(str, sorted(output.iterdir())))
    release = next(item for item in api(f"{base}/releases?per_page=100") if item["tag_name"] == tag)
    assets = {item["name"]: item for item in release["assets"]}
    if set(assets) != set(hashes):
        raise ValueError("Release asset set differs from reviewed output")
    for name, digest in hashes.items():
        item = assets[name]
        if item["state"] != "uploaded" or item["size"] != (output / name).stat().st_size or item["digest"] != "sha256:" + digest:
            raise ValueError("Uploaded asset verification failed: " + name)
        print("Verified " + name + " SHA256 " + digest)
    gh("release", "edit", tag, "--repo", repo, "--draft=false", "--latest")
    print(f"Published https://github.com/{repo}/releases/tag/{tag}")


if __name__ == "__main__":
    publish()

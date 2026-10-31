#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"
case "${1:-run}" in
  test) cargo test --locked --manifest-path backend/Cargo.toml
        cargo test --locked --manifest-path src-tauri/Cargo.toml ;;
  build) cargo build --locked --manifest-path src-tauri/Cargo.toml ;;
  run) cargo run --locked --manifest-path src-tauri/Cargo.toml ;;
  package)
    if [[ "$(uname -s)" != Darwin ]]; then
      echo 'macOS packaging must run on a Mac.' >&2; exit 1
    fi
    command -v npm >/dev/null || { echo 'Install Node.js with npm for build tooling.' >&2; exit 1; }
    rustup target add aarch64-apple-darwin x86_64-apple-darwin
    npm ci --ignore-scripts --no-audit --no-fund
    npm run package:macos ;;
  *) echo 'Usage: bash scripts/desktop.sh [test|build|run|package]' >&2; exit 1 ;;
esac

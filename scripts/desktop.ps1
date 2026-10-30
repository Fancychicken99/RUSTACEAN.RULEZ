param(
    [ValidateSet('Test', 'Build', 'Run')][string]$Action = 'Run',
    [switch]$Release
)
$ErrorActionPreference = 'Stop'
$cargoCommand = Get-Command cargo -ErrorAction SilentlyContinue
$cargoPath = if ($cargoCommand) { $cargoCommand.Source } else { Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe' }
if (-not (Test-Path -LiteralPath $cargoPath)) { throw 'Cargo was not found. See docs/rust-development.md.' }
$manifest = Join-Path $PSScriptRoot '..\src-tauri\Cargo.toml'
$cargoArgs = @($Action.ToLowerInvariant(), '--locked', '--manifest-path', $manifest)
if ($Release) { $cargoArgs += '--release' }
& $cargoPath @cargoArgs
if ($LASTEXITCODE -ne 0) { throw "Desktop $Action failed (exit $LASTEXITCODE)." }

param(
    [ValidateSet('Test', 'Build', 'Run', 'Package')][string]$Action = 'Run',
    [switch]$Release
)
$ErrorActionPreference = 'Stop'
$cargoCommand = Get-Command cargo -ErrorAction SilentlyContinue
$cargoPath = if ($cargoCommand) { $cargoCommand.Source } else { Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe' }
if (-not (Test-Path -LiteralPath $cargoPath)) { throw 'Cargo was not found. See docs/rust-development.md.' }
if ($Action -eq 'Package') {
    $projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
    $cli = Join-Path $projectRoot 'node_modules\@tauri-apps\cli\tauri.js'
    if (-not (Test-Path -LiteralPath $cli)) { throw 'Run npm ci first to install pinned packaging tools.' }
    $env:PATH = (Split-Path $cargoPath) + [IO.Path]::PathSeparator + $env:PATH
    Push-Location $projectRoot
    try {
        & node $cli build --bundles nsis -- --locked
        if ($LASTEXITCODE -ne 0) { throw "Desktop packaging failed (exit $LASTEXITCODE)." }
    } finally { Pop-Location }
    return
}
$manifest = Join-Path $PSScriptRoot '..\src-tauri\Cargo.toml'
$cargoArgs = @($Action.ToLowerInvariant(), '--locked', '--manifest-path', $manifest)
if ($Release) { $cargoArgs += '--release' }
& $cargoPath @cargoArgs
if ($LASTEXITCODE -ne 0) { throw "Desktop $Action failed (exit $LASTEXITCODE)." }

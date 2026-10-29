param([switch]$WorkflowsOnly)
$ErrorActionPreference = 'Stop'
$cargoCommand = Get-Command cargo -ErrorAction SilentlyContinue
$cargoPath = if ($cargoCommand) { $cargoCommand.Source } else { Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe' }
if (-not (Test-Path -LiteralPath $cargoPath)) {
    throw 'Cargo was not found. Follow docs/rust-development.md to install Rust.'
}
$manifest = Join-Path $PSScriptRoot '..\backend-prototype\Cargo.toml'
$cargoArgs = @('test', '--locked', '--manifest-path', $manifest)
if ($WorkflowsOnly) { $cargoArgs += @('--test', 'persistence_workflows') }
& $cargoPath @cargoArgs
if ($LASTEXITCODE -ne 0) { throw "Backend tests failed (exit $LASTEXITCODE)." }

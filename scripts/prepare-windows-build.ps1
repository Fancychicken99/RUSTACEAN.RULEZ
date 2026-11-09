# Developer/CI prerequisite only; no machine-wide installation or PATH changes.
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$toolsRoot = Join-Path $projectRoot 'src-tauri\target\build-tools'
$perlBin = Join-Path $toolsRoot 'strawberry\perl\bin'
$portablePerl = Join-Path $perlBin 'perl.exe'
if (-not (Test-Path -LiteralPath $portablePerl)) {
    New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
    $archive = Join-Path $toolsRoot 'strawberry-perl-5.42.3.1.zip'
    $expected = '6a081a811781c30aca51dbc036afd93092af91e3297901f02c17043795a10690'
    if (-not (Test-Path -LiteralPath $archive) -or (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) {
        & curl.exe --silent --show-error --fail --location --retry 2 --output $archive 'https://github.com/StrawberryPerl/Perl-Dist-Strawberry/releases/download/SP_54231_64bit/strawberry-perl-5.42.3.1-64bit-portable.zip'
        if ($LASTEXITCODE -ne 0) { throw 'Portable Perl download failed.' }
    }
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'Portable Perl checksum mismatch.' }
    $destination = Join-Path $toolsRoot 'strawberry'
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    & tar.exe -xf $archive -C $destination perl
    if ($LASTEXITCODE -ne 0) { throw 'Portable Perl extraction failed.' }
}
$env:PATH = $perlBin + [IO.Path]::PathSeparator + $env:PATH
$env:LC_ALL = 'C'
& $portablePerl -MFindBin -MIPC::Cmd -e 'print "Native build Perl ready\n"'
if ($LASTEXITCODE -ne 0) { throw 'Perl build modules unavailable.' }
if ($env:GITHUB_PATH) { Add-Content -LiteralPath $env:GITHUB_PATH -Value $perlBin }

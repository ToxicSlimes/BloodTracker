param(
    [string]$Configuration = "Release",
    [switch]$Clean = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=== BloodTracker Build Script ===" -ForegroundColor Cyan
Write-Host "Configuration: $Configuration" -ForegroundColor Yellow
Write-Host ""

$apiPath     = ".\src\BloodTracker.Api"
$projectPath = Join-Path $apiPath "BloodTracker.Api.csproj"

function Ensure-File([string]$path, [string]$hint = "") {
    if (!(Test-Path $path)) {
        Write-Host "Missing file: $path" -ForegroundColor Red
        if ($hint) { Write-Host $hint -ForegroundColor Yellow }
        exit 1
    }
}

function Tail-Lines([string]$text, [int]$count = 80) {
    $lines = $text -split "`r?`n"
    if ($lines.Length -le $count) { return $text }
    return ($lines[($lines.Length - $count)..($lines.Length - 1)] -join "`n")
}

if ($Clean) {
    Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
    dotnet clean $projectPath -c $Configuration | Out-Host

    $cleanPaths = @(
        ".\bin",
        (Join-Path $apiPath "bin"),
        (Join-Path $apiPath "obj\desktop")
    )

    foreach ($path in $cleanPaths) {
        if (Test-Path $path) {
            Remove-Item -Path $path -Recurse -Force
            Write-Host "  Removed: $path" -ForegroundColor Gray
        }
    }

    Write-Host "Clean completed." -ForegroundColor Green
    Write-Host ""
}

Write-Host "Restoring packages..." -ForegroundColor Yellow
dotnet restore $projectPath | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Restore failed" }
Write-Host "Restore completed." -ForegroundColor Green
Write-Host ""

# --- Sanity + auto-fix manifest beforePack path ---
$manifestPath = Join-Path $apiPath "electron.manifest.json"
$beforePackJs = Join-Path $apiPath "build\beforePack.js"

Ensure-File $manifestPath "Expected: src\BloodTracker.Api\electron.manifest.json"
Ensure-File $beforePackJs  "Expected: src\BloodTracker.Api\build\beforePack.js"

try {
    $manifestRaw = Get-Content -Raw -Path $manifestPath -Encoding UTF8
    $manifest    = $manifestRaw | ConvertFrom-Json
} catch {
    throw "Cannot parse electron.manifest.json as JSON: $manifestPath"
}

if (-not $manifest.build) { throw "electron.manifest.json: missing 'build' section" }

# --- Build (capture log) ---
Write-Host "Building Electron application (electronize)..." -ForegroundColor Yellow

Push-Location $apiPath
try {
    $logLines = New-Object System.Collections.Generic.List[string]

    & electronize build /target win /dotnet-configuration $Configuration /electron-arch x64 2>&1 |
            ForEach-Object {
                $logLines.Add($_.ToString()) | Out-Null
                $_
            }

    $log = ($logLines -join "`n")

    $failurePatterns = @(
        'failedTask=build',
        'Cannot find module',
        'Unable to `require`',
        'ENOENT:'
    )

    $looksLikeFailure = ($LASTEXITCODE -ne 0)
    if (-not $looksLikeFailure) {
        foreach ($p in $failurePatterns) {
            if ($log -match $p) { $looksLikeFailure = $true; break }
        }
    }

    if ($looksLikeFailure) {
        Write-Host ""
        Write-Host "electronize/electron-builder failed. Tail log:" -ForegroundColor Red
        Write-Host (Tail-Lines $log 120) -ForegroundColor Gray
        throw "Electron build failed"
    }

    Write-Host "Electron build completed." -ForegroundColor Green
} finally {
    Pop-Location
}
Write-Host ""

# --- Output detection ---
$outputPath      = Join-Path $apiPath "bin\Desktop"
$winUnpackedPath = Join-Path $outputPath "win-unpacked"

$portableExe = $null
if (Test-Path $outputPath) {
    $portableExe = Get-ChildItem -Path $outputPath -Recurse -Filter "*.exe" -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notlike "*electron*" } |
            Sort-Object Length -Descending |
            Select-Object -First 1
}

$unpackedExe = $null
if (Test-Path $winUnpackedPath) {
    $unpackedExe = Get-ChildItem -Path $winUnpackedPath -Filter "*.exe" -File -ErrorAction SilentlyContinue |
            Sort-Object Length -Descending |
            Select-Object -First 1
}

if ($portableExe) {
    $sizeMB = [math]::Round($portableExe.Length / 1MB, 2)
    Write-Host "=== Build Successful ===" -ForegroundColor Green
    Write-Host "Output: $($portableExe.FullName)" -ForegroundColor Cyan
    Write-Host "Size: $sizeMB MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To run:" -ForegroundColor Yellow
    Write-Host "  & `"$($portableExe.FullName)`"" -ForegroundColor White
}
elseif ($unpackedExe) {
    $sizeMB = [math]::Round($unpackedExe.Length / 1MB, 2)
    Write-Host "=== Build Successful (win-unpacked) ===" -ForegroundColor Green
    Write-Host "Output: $($unpackedExe.FullName)" -ForegroundColor Cyan
    Write-Host "Size: $sizeMB MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To run:" -ForegroundColor Yellow
    Write-Host "  & `"$($unpackedExe.FullName)`"" -ForegroundColor White
}
else {
    Write-Host "No exe found in: $outputPath" -ForegroundColor Red
    if (Test-Path $outputPath) {
        Write-Host "Exe candidates:" -ForegroundColor Yellow
        Get-ChildItem -Path $outputPath -Recurse -Filter "*.exe" -File -ErrorAction SilentlyContinue |
                Select-Object FullName, Length |
                Sort-Object Length -Descending |
                Format-Table -AutoSize | Out-String | Write-Host
    }
    throw "Build produced no runnable exe"
}

# Install the latest LiSCA desktop release for Windows.
# The NSIS installer is per user. Linux and macOS use get-studio.sh.
#
#   irm https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-studio.ps1 | iex
#   $env:LISCA_APP = "aligner"; irm https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-studio.ps1 | iex
#
# Keep the asset rules in step with get-studio.sh.
# Tests pass -PrintUrl and set LISCA_RELEASES_JSON, LISCA_OS, and LISCA_ARCH.
$ErrorActionPreference = "Stop"

$Repo = "keejkrej/lisca"
$Product = "studio"
$PrintUrl = $false
$ChoseProduct = $false

if ($args) {
    foreach ($arg in $args) {
        if ($arg -eq "--print-url" -or $arg -eq "-PrintUrl") {
            $PrintUrl = $true
        } elseif ($arg -eq "studio" -or $arg -eq "aligner" -or $arg -eq "annotator") {
            if ($ChoseProduct) { throw "Unexpected extra argument: $arg" }
            $Product = $arg
            $ChoseProduct = $true
        } elseif ($arg -like "-*") {
            throw "Unknown flag: $arg"
        } else {
            throw "Unknown argument: $arg"
        }
    }
}
if (-not $ChoseProduct -and $env:LISCA_APP) {
    $Product = $env:LISCA_APP
}
if ($Product -ne "studio" -and $Product -ne "aligner" -and $Product -ne "annotator") {
    throw "Product must be studio, aligner, or annotator."
}

function Test-LiscaArch([string]$Name, [string]$Arch) {
    $lowered = $Name.ToLowerInvariant()
    if ($Arch -eq "x86_64") {
        if ($lowered.Contains("aarch64") -or $lowered.Contains("arm64")) { return $false }
        return $lowered.Contains("amd64") -or $lowered.Contains("x86_64") -or $lowered.Contains("x64")
    }
    if ($Arch -eq "aarch64") {
        return $lowered.Contains("aarch64") -or $lowered.Contains("arm64")
    }
    return $false
}

function Test-LiscaOs([string]$Name, [string]$Os) {
    $lowered = $Name.ToLowerInvariant()
    if ($lowered.EndsWith(".sig") -or $lowered.EndsWith(".zsync")) { return $false }
    if ($Os -eq "linux") { return $lowered.EndsWith(".appimage") }
    if ($Os -eq "darwin") { return $lowered.EndsWith(".dmg") }
    if ($Os -eq "windows") { return $lowered.EndsWith(".exe") }
    return $false
}

function Get-LiscaAsset($Releases, [string]$App, [string]$Os, [string]$Arch) {
    $prefix = "$App-v"
    foreach ($release in @($Releases)) {
        $tag = [string]$release.tag_name
        if ($release.draft -or $release.prerelease -or -not $tag.StartsWith($prefix)) { continue }
        $hits = @()
        foreach ($asset in @($release.assets)) {
            if (-not $asset) { continue }
            $name = [string]$asset.name
            $url = [string]$asset.browser_download_url
            if ($name -and $url -and (Test-LiscaOs $name $Os) -and (Test-LiscaArch $name $Arch)) {
                $hits += [pscustomobject]@{ Url = $url; Name = $name }
            }
        }
        if ($hits.Count -gt 1) { throw "$tag has more than one $Os $Arch installer." }
        if ($hits.Count -eq 1) { return $hits[0] }
        throw "$tag has no $Os $Arch installer."
    }
    throw "No $prefix* release has a $Os $Arch installer."
}

if ($PrintUrl) {
    if (-not $env:LISCA_OS -or -not $env:LISCA_ARCH -or -not $env:LISCA_RELEASES_JSON) {
        throw "Set LISCA_OS, LISCA_ARCH, and LISCA_RELEASES_JSON for -PrintUrl."
    }
    $releases = Get-Content -Raw -Path $env:LISCA_RELEASES_JSON | ConvertFrom-Json
    $chosen = Get-LiscaAsset $releases $Product $env:LISCA_OS $env:LISCA_ARCH
    Write-Output $chosen.Url
    return
}

$arch = "x86_64"
if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { $arch = "aarch64" }

$headers = @{
    Accept                 = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}
$token = $env:GH_TOKEN
if (-not $token) { $token = $env:GITHUB_TOKEN }
if ($token) { $headers.Authorization = "Bearer $token" }

$releases = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$Repo/releases?per_page=100"
$chosen = Get-LiscaAsset $releases $Product "windows" $arch
$destination = Join-Path $env:TEMP $chosen.Name
Invoke-WebRequest -Uri $chosen.Url -OutFile $destination
$installer = Start-Process -FilePath $destination -ArgumentList "/S" -Wait -PassThru
if ($installer.ExitCode -ne 0) {
    throw "Installer exited $($installer.ExitCode)"
}
Write-Host "Installed $Product from $($chosen.Name)"

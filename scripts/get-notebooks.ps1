# First-time notebooks get.
# If git is on PATH: clone export branch notebooks, then install.
# If git is missing: download the latest notebooks-v* zip, extract, install.
# irm https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.ps1 | iex
# Env: LISCA_NOTEBOOKS_DIR, GH_TOKEN / GITHUB_TOKEN (private repo).
# Optional: -NoInstall, destination dir.
$ErrorActionPreference = "Stop"

$Repo = "keejkrej/lisca"
$CloneUrl = "https://github.com/$Repo.git"
$Api = "https://api.github.com/repos/$Repo/releases"

$NoInstall = $false
$Dest = $env:LISCA_NOTEBOOKS_DIR
if ($args) {
    foreach ($arg in $args) {
        if ($arg -eq "-NoInstall" -or $arg -eq "--no-install") {
            $NoInstall = $true
        } elseif ($arg -like "-*") {
            throw "Unknown flag: $arg"
        } elseif (-not $Dest) {
            $Dest = $arg
        } else {
            throw "Unexpected extra argument: $arg"
        }
    }
}
if (-not $Dest) {
    $Dest = "lisca-notebooks"
}

$Token = $env:GH_TOKEN
if (-not $Token) {
    $Token = $env:GITHUB_TOKEN
}
$Headers = @{ "Accept" = "application/vnd.github+json" }
if ($Token) {
    $Headers["Authorization"] = "Bearer $Token"
    $CloneUrl = "https://x-access-token:${Token}@github.com/$Repo.git"
}

function Write-AuthHint {
    if (-not $Token) {
        Write-Host "If this repo is private, set GH_TOKEN or GITHUB_TOKEN."
    }
}

function Write-UpdateNeedsGit {
    Write-Host "This zip extract is not a git checkout. update.ps1 requires git."
    Write-Host "Install git, then in $Dest run: .\update.ps1"
    Write-Host "That bootstraps onto export branch notebooks (keeps .venv / .uv)."
    Write-Host "  winget install Git.Git"
    Write-Host "  or https://git-scm.com/download/win"
}

function Get-LatestNotebooksZip {
    Write-Host "Fetching latest notebooks-v* GitHub Release..."
    try {
        $releases = Invoke-RestMethod -Uri $Api -Headers $Headers
    } catch {
        Write-AuthHint
        throw "Failed to list GitHub Releases for $Repo."
    }
    $best = $null
    $bestKey = $null
    foreach ($rel in $releases) {
        if ($rel.draft) { continue }
        $tag = [string]$rel.tag_name
        if (-not $tag.StartsWith("notebooks-v")) { continue }
        $ver = $tag.Substring("notebooks-v".Length)
        if ($ver -notmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') { continue }
        $parts = $ver.Split(".") | ForEach-Object { [int]$_ }
        $key = "{0:D6}.{1:D6}.{2:D6}|{3}" -f $parts[0], $parts[1], $parts[2], $rel.published_at
        if (-not $best -or $key -gt $bestKey) {
            $best = $rel
            $bestKey = $key
        }
    }
    if (-not $best) {
        throw "No GitHub Release with tag notebooks-vX.Y.Z found."
    }
    $asset = $best.assets | Where-Object { $_.name -like "lisca-notebooks-*.zip" } | Select-Object -First 1
    if (-not $asset) {
        throw "Release $($best.tag_name) has no lisca-notebooks-*.zip asset."
    }
    return @{ Tag = $best.tag_name; Name = $asset.name; Id = $asset.id; Url = $asset.browser_download_url }
}

function Install-FromZip {
    $info = Get-LatestNotebooksZip
    Write-Host "Downloading $($info.Name) ($($info.Tag))..."
    $work = Join-Path ([System.IO.Path]::GetTempPath()) ("lisca-notebooks-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $work | Out-Null
    $zipPath = Join-Path $work $info.Name
    try {
        if ($Token) {
            $dlHeaders = @{
                Authorization = "Bearer $Token"
                Accept        = "application/octet-stream"
            }
            $assetUrl = "https://api.github.com/repos/$Repo/releases/assets/$($info.Id)"
            Invoke-WebRequest -Uri $assetUrl -Headers $dlHeaders -OutFile $zipPath
        } else {
            Invoke-WebRequest -Uri $info.Url -OutFile $zipPath
        }
    } catch {
        Write-AuthHint
        throw "Failed to download $($info.Name)."
    }
    $extract = Join-Path $work "extracted"
    Expand-Archive -Path $zipPath -DestinationPath $extract -Force
    $top = Get-ChildItem -LiteralPath $extract | Where-Object { $_.PSIsContainer }
    if ($top.Count -ne 1) {
        throw "Zip did not contain a single top-level folder."
    }
    $parent = Split-Path -Parent $Dest
    if ($parent) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    Move-Item -LiteralPath $top[0].FullName -Destination $Dest
    Remove-Item -LiteralPath $work -Recurse -Force
}

if (Test-Path -LiteralPath $Dest) {
    throw "Destination already exists: $Dest`nFor updates, cd there and run .\update.ps1 (requires git)."
}

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    Write-Host "git found; cloning export branch notebooks..."
    $parent = Split-Path -Parent $Dest
    if ($parent) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    git clone --branch notebooks --single-branch --depth 1 $CloneUrl $Dest
    if ($LASTEXITCODE -ne 0) {
        Write-AuthHint
        throw "Clone of branch notebooks failed. Airgapped: download lisca-notebooks-X.Y.Z.zip from GitHub Releases, extract, then .\install.ps1."
    }
} else {
    Write-Host "git not found; downloading the latest notebooks-v* zip."
    Install-FromZip
    Write-UpdateNeedsGit
}

if (-not (Test-Path -LiteralPath (Join-Path $Dest "install.ps1")) -or -not (Test-Path -LiteralPath (Join-Path $Dest "pyproject.toml"))) {
    throw "Extracted/cloned tree is missing install.ps1 or pyproject.toml: $Dest"
}

if (-not $NoInstall) {
    & (Join-Path $Dest "install.ps1")
} else {
    Write-Host "Skipped install (-NoInstall). Next: cd $Dest; .\install.ps1"
}

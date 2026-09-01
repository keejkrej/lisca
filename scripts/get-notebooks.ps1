# First-time notebooks get. Always bootstraps portable MinGit under DEST\.tools\git
# (same idea as .uv) and clones export branch notebooks. Zip extract is second-class:
# pass -Zip. irm https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.ps1 | iex
# Env: LISCA_NOTEBOOKS_DIR, GH_TOKEN / GITHUB_TOKEN (private repo).
# Optional: -NoInstall, -Zip, destination dir.
$ErrorActionPreference = "Stop"

$Repo = "keejkrej/lisca"
$CloneUrl = "https://github.com/$Repo.git"
$Api = "https://api.github.com/repos/$Repo/releases"

$NoInstall = $false
$ZipMode = $false
$Dest = $env:LISCA_NOTEBOOKS_DIR
if ($args) {
    foreach ($arg in $args) {
        if ($arg -eq "-NoInstall" -or $arg -eq "--no-install") {
            $NoInstall = $true
        } elseif ($arg -eq "-Zip" -or $arg -eq "--zip") {
            $ZipMode = $true
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

# Portable MinGit pins. Keep in sync with get-notebooks.sh / notebooks/update.ps1.
function Get-MinGitPin {
    $arch = $env:PROCESSOR_ARCHITECTURE
    if ($arch -eq "ARM64") {
        return @{
            Name = "MinGit-2.55.0.5-arm64.zip"
            Url  = "https://github.com/git-for-windows/git/releases/download/v2.55.0.windows.5/MinGit-2.55.0.5-arm64.zip"
            Sha  = "05843f9d6e60306c3ab886799e2c67200caab921571f10512df3493049179ddb"
        }
    }
    return @{
        Name = "MinGit-2.55.0.5-64-bit.zip"
        Url  = "https://github.com/git-for-windows/git/releases/download/v2.55.0.windows.5/MinGit-2.55.0.5-64-bit.zip"
        Sha  = "56d7b226b7693196cfc71fef26568f536c4a021ab6c37ff2db4287bed908e96e"
    }
}

function Get-PortableGitBin {
    param([string]$HomeDir)
    $candidates = @(
        (Join-Path $HomeDir (Join-Path "cmd" "git.exe")),
        (Join-Path $HomeDir (Join-Path "mingw64" (Join-Path "bin" "git.exe"))),
        (Join-Path $HomeDir (Join-Path "bin" "git.exe"))
    )
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) {
            $ver = & $c --version 2>$null | Out-String
            if ($ver -match "git version") {
                return $c
            }
        }
    }
    return $null
}

function Install-PortableGit {
    param([string]$HomeDir)
    $existing = Get-PortableGitBin -HomeDir $HomeDir
    if ($existing) {
        Write-Host "Using portable git at $existing"
        return $existing
    }
    if (Test-Path -LiteralPath $HomeDir) {
        Remove-Item -LiteralPath $HomeDir -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $HomeDir | Out-Null
    $pin = Get-MinGitPin
    Write-Host "Downloading portable git ($($pin.Name)) into $HomeDir ..."
    $zipPath = Join-Path ([System.IO.Path]::GetTempPath()) $pin.Name
    try {
        Invoke-WebRequest -Uri $pin.Url -OutFile $zipPath
        $got = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()
        if ($got -ne $pin.Sha) {
            throw "Checksum mismatch for portable git (got $got, expected $($pin.Sha))."
        }
        $work = Join-Path ([System.IO.Path]::GetTempPath()) ("lisca-git-" + [guid]::NewGuid().ToString("N"))
        Expand-Archive -Path $zipPath -DestinationPath $work -Force
        $top = Get-ChildItem -LiteralPath $work | Where-Object { $_.PSIsContainer }
        if ($top.Count -eq 1) {
            Copy-Item -Path (Join-Path $top[0].FullName "*") -Destination $HomeDir -Recurse -Force
        } else {
            Copy-Item -Path (Join-Path $work "*") -Destination $HomeDir -Recurse -Force
        }
        Remove-Item -LiteralPath $work -Recurse -Force
    } finally {
        if (Test-Path -LiteralPath $zipPath) {
            Remove-Item -LiteralPath $zipPath -Force
        }
    }
    $bin = Get-PortableGitBin -HomeDir $HomeDir
    if (-not $bin) {
        throw "Portable git downloaded but git --version failed in $HomeDir."
    }
    return $bin
}

function Invoke-PortableGit {
    param(
        [Parameter(Mandatory = $true)][string]$GitHome,
        [Parameter(Mandatory = $true)][string]$GitBin,
        [Parameter(ValueFromRemainingArguments = $true)]$GitArgs
    )
    $argList = @($GitArgs)
    if ($argList.Count -gt 0 -and $argList[0] -eq "--") {
        $argList = $argList[1..($argList.Count - 1)]
    }
    $bindir = Split-Path -Parent $GitBin
    $saved = $env:PATH
    $env:PATH = "$bindir;$saved"
    try {
        & $GitBin @argList
    } finally {
        $env:PATH = $saved
    }
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
    throw "Destination already exists: $Dest`nFor updates, cd there and run .\update.ps1."
}

$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("lisca-git-" + [guid]::NewGuid().ToString("N"))
$gitBin = Install-PortableGit -HomeDir $stage
Write-Host "Portable git: $gitBin"

if ($ZipMode) {
    Write-Host "Zip mode: extracting the latest notebooks-v* GitHub Release (not a git clone)."
    Install-FromZip
} else {
    Write-Host "Cloning export branch notebooks with portable git..."
    Invoke-PortableGit -GitHome $stage -GitBin $gitBin -- clone --branch notebooks --single-branch --depth 1 $CloneUrl $Dest
    if ($LASTEXITCODE -ne 0) {
        Write-AuthHint
        throw "Clone of branch notebooks failed. Airgapped / no branch yet: re-run with -Zip, or download lisca-notebooks-X.Y.Z.zip from GitHub Releases."
    }
}

$tools = Join-Path $Dest ".tools"
New-Item -ItemType Directory -Force -Path $tools | Out-Null
$destGit = Join-Path $tools "git"  # .tools/git
if (Test-Path -LiteralPath $destGit) {
    Remove-Item -LiteralPath $destGit -Recurse -Force
}
Move-Item -LiteralPath $stage -Destination $destGit

if (-not (Test-Path -LiteralPath (Join-Path $Dest "install.ps1")) -or -not (Test-Path -LiteralPath (Join-Path $Dest "pyproject.toml"))) {
    throw "Extracted/cloned tree is missing install.ps1 or pyproject.toml: $Dest"
}

if (-not $NoInstall) {
    & (Join-Path $Dest "install.ps1")
} else {
    Write-Host "Skipped install (-NoInstall). Next: cd $Dest; .\install.ps1"
}

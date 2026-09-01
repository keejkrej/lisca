# First-time notebooks get. Always clones export branch notebooks, then install.
# Uses system git if present, otherwise portable MinGit under DEST\.tools\git.
# irm https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.ps1 | iex
# Env: LISCA_NOTEBOOKS_DIR, GH_TOKEN / GITHUB_TOKEN (private repo).
# Optional: -NoInstall, destination dir.
$ErrorActionPreference = "Stop"

$Repo = "keejkrej/lisca"
$CloneUrl = "https://github.com/$Repo.git"

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
if ($Token) {
    $CloneUrl = "https://x-access-token:${Token}@github.com/$Repo.git"
}

function Write-AuthHint {
    if (-not $Token) {
        Write-Host "If this repo is private, set GH_TOKEN or GITHUB_TOKEN."
    }
}

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

function Invoke-ResolvedGit {
    param(
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

if (Test-Path -LiteralPath $Dest) {
    throw "Destination already exists: $Dest`nFor updates, cd there and run .\update.ps1."
}

$stage = $null
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($gitCmd) {
    $GitBin = $gitCmd.Source
    Write-Host "Using system git: $GitBin"
} else {
    Write-Host "System git not found; installing portable git..."
    $stage = Join-Path ([System.IO.Path]::GetTempPath()) ("lisca-git-" + [guid]::NewGuid().ToString("N"))
    $GitBin = Install-PortableGit -HomeDir $stage
    Write-Host "Portable git: $GitBin"
}

Write-Host "Cloning export branch notebooks..."
$parent = Split-Path -Parent $Dest
if ($parent) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
}
Invoke-ResolvedGit -GitBin $GitBin -- clone --branch notebooks --single-branch --depth 1 $CloneUrl $Dest
if ($LASTEXITCODE -ne 0) {
    Write-AuthHint
    throw "Clone of branch notebooks failed."
}

if ($stage) {
    $tools = Join-Path $Dest ".tools"
    New-Item -ItemType Directory -Force -Path $tools | Out-Null
    $destGit = Join-Path $tools "git"  # .tools/git
    if (Test-Path -LiteralPath $destGit) {
        Remove-Item -LiteralPath $destGit -Recurse -Force
    }
    Move-Item -LiteralPath $stage -Destination $destGit
}

if (-not (Test-Path -LiteralPath (Join-Path $Dest "install.ps1")) -or -not (Test-Path -LiteralPath (Join-Path $Dest "pyproject.toml"))) {
    throw "Cloned tree is missing install.ps1 or pyproject.toml: $Dest"
}

if (-not $NoInstall) {
    & (Join-Path $Dest "install.ps1")
} else {
    Write-Host "Skipped install (-NoInstall). Next: cd $Dest; .\install.ps1"
}

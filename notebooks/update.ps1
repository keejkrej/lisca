# Update this notebooks tree from export branch notebooks, then uv sync like install.
# Requires git. First get may be a zip extract (no .git): bootstrap onto branch
# notebooks without deleting .venv / .uv. Does not download a notebooks zip.
$ErrorActionPreference = "Stop"

function Wait-PressAnyKeyToExit {
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor DarkGray
    try {
        if (-not [Environment]::UserInteractive -or [Console]::IsInputRedirected) {
            Read-Host "Press Enter to exit"
            return
        }
        while ([Console]::KeyAvailable) {
            [void][Console]::ReadKey($true)
        }
        [void][Console]::ReadKey($true)
    } catch {
        Read-Host "Press Enter to exit"
    }
}

$ScriptDir = $PSScriptRoot
if (Test-Path -LiteralPath (Join-Path $ScriptDir "pyproject.toml")) {
    $Root = $ScriptDir
} else {
    $Root = Split-Path -Parent $ScriptDir
}

$OriginUrl = "https://github.com/keejkrej/lisca.git"
$CloneHint = "git clone --branch notebooks --single-branch --depth 1 $OriginUrl lisca-notebooks"
$UvDir = Join-Path $Root ".uv"
$VenvDir = Join-Path $Root ".venv"
$Arch = "x86_64-pc-windows-msvc"
$UvExe = Join-Path $UvDir "uv.exe"

function Write-GitInstallHint {
    Write-Host "git is required for update. Install git, then re-run .\update.ps1."
    Write-Host "  winget install Git.Git"
    Write-Host "  or https://git-scm.com/download/win"
    Write-Host "First-time get without git:"
    Write-Host "  irm https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.ps1 | iex"
}

function Ensure-Gitignore {
    $gi = Join-Path $Root ".gitignore"
    if (-not (Test-Path -LiteralPath $gi)) {
        New-Item -ItemType File -Path $gi | Out-Null
    }
    $text = Get-Content -LiteralPath $gi -ErrorAction SilentlyContinue
    $lines = @()
    if ($text) { $lines = @($text) }
    foreach ($need in @(".venv/", ".uv/")) {
        if ($lines -notcontains $need) {
            Add-Content -LiteralPath $gi -Value $need
        }
    }
}

$installExitCode = 0
try {
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitCmd) {
        Write-GitInstallHint
        throw "git is required for update.ps1."
    }

    $GitDir = Join-Path $Root ".git"
    if (-not (Test-Path -LiteralPath $GitDir)) {
        Write-Host "No .git here (zip extract). Bootstrapping onto export branch notebooks..."
        Write-Host "Keeping .venv / .uv."
        Ensure-Gitignore
        git -C $Root init -q
        if ($LASTEXITCODE -ne 0) { throw "git init failed (exit $LASTEXITCODE)" }
        git -C $Root remote get-url origin 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            git -C $Root remote add origin $OriginUrl
            if ($LASTEXITCODE -ne 0) { throw "git remote add failed (exit $LASTEXITCODE)" }
        }
        git -C $Root fetch --depth 1 origin notebooks
        if ($LASTEXITCODE -ne 0) { throw "git fetch origin notebooks failed (exit $LASTEXITCODE)" }
        git -C $Root checkout -f -B notebooks origin/notebooks
        if ($LASTEXITCODE -ne 0) { throw "git checkout notebooks failed (exit $LASTEXITCODE)" }
    } else {
        $branch = (git -C $Root rev-parse --abbrev-ref HEAD 2>$null)
        $upstream = $null
        try {
            $upstream = (git -C $Root rev-parse --abbrev-ref "@{upstream}" 2>$null)
        } catch {
            $upstream = $null
        }
        $onNotebooks = ($branch -eq "notebooks") -or ($upstream -like "*/notebooks")
        if (-not $onNotebooks) {
            $got = if ($branch) { $branch } else { "detached" }
            throw "This folder tracks '$got', not notebooks. update.ps1 only tracks the notebooks export branch, not main. Re-clone:`n  $CloneHint"
        }
        $porcelain = git -C $Root status --porcelain
        if ($LASTEXITCODE -ne 0) {
            throw "git status failed (exit $LASTEXITCODE)"
        }
        if ($porcelain) {
            Write-Host $porcelain
            throw "Working tree is dirty. Stash or re-clone, then retry."
        }
        Write-Host "Pulling branch notebooks (ff-only)..."
        git -C $Root pull --ff-only
        if ($LASTEXITCODE -ne 0) {
            throw "git pull --ff-only failed (diverged from upstream). Stash/reset or re-clone:`n  $CloneHint"
        }
    }

    if (-not (Test-Path $UvExe)) {
        New-Item -ItemType Directory -Force -Path $UvDir | Out-Null
        $ZipName = "uv-$Arch.zip"
        $Url = "https://github.com/astral-sh/uv/releases/latest/download/$ZipName"
        $ZipPath = Join-Path $UvDir $ZipName
        Write-Host "Downloading uv (latest release)..."
        Invoke-WebRequest -Uri $Url -OutFile $ZipPath
        Expand-Archive -Path $ZipPath -DestinationPath $UvDir -Force
        $Nested = Get-ChildItem -Path $UvDir -Recurse -Filter "uv.exe" | Select-Object -First 1
        if ($Nested) {
            Move-Item -Path $Nested.FullName -Destination $UvExe -Force
            $NestedDir = $Nested.DirectoryName
            if ($NestedDir -ne $UvDir) {
                Remove-Item -Path $NestedDir -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        Remove-Item $ZipPath
    }

    Write-Host "Installing Python 3.12..."
    & $UvExe python install 3.12
    if ($LASTEXITCODE -ne 0) {
        throw "uv python install failed (exit $LASTEXITCODE)"
    }

    $PythonExe = Join-Path $VenvDir (Join-Path "Scripts" "python.exe")
    $NeedVenv = $true
    if (Test-Path -LiteralPath $PythonExe) {
        $Current = & $PythonExe -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
        if ($LASTEXITCODE -eq 0 -and $Current -eq "3.12") {
            $NeedVenv = $false
        } else {
            Write-Host "Recreating venv (need Python 3.12)..."
            Remove-Item -LiteralPath $VenvDir -Recurse -Force
        }
    }

    if ($NeedVenv) {
        Write-Host "Creating venv..."
        & $UvExe venv --python 3.12 $VenvDir
        if ($LASTEXITCODE -ne 0) {
            throw "uv venv failed (exit $LASTEXITCODE)"
        }
    }

    Write-Host "Installing notebook environment..."
    & $UvExe sync --python 3.12 --extra notebook --directory $Root
    if ($LASTEXITCODE -ne 0) {
        throw "uv sync failed (exit $LASTEXITCODE)"
    }

    $Version = (Get-Content -LiteralPath (Join-Path $Root "VERSION") -Raw).Trim()
    $Describe = $null
    try {
        $Describe = (git -C $Root describe --tags --always 2>$null)
    } catch {
        $Describe = $null
    }
    if ($Describe) {
        Write-Host "Done. Now at $Version ($Describe)."
    } else {
        Write-Host "Done. Now at $Version."
    }
    Write-Host ""
    Write-Host "Config cells in notebooks/ may have changed; re-check them before running."
    Write-Host "On a laptop, start Jupyter with:"
    Write-Host "  .\scripts\jupyter-notebook.ps1"
    Write-Host "On JupyterHub, register the Lisca kernel with:"
    Write-Host "  .\scripts\jupyter-hub.ps1"
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    $installExitCode = 1
} finally {
    Wait-PressAnyKeyToExit
}

exit $installExitCode

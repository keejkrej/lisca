# Update this notebooks tree from export branch notebooks, then uv sync like install.
# Always uses portable MinGit under ROOT\.tools\git (download if missing). First get
# may be a zip extract (no .git): bootstrap onto branch notebooks without deleting
# .venv / .uv / .tools. Does not download a notebooks zip. Does not use system git.
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
$CloneHint = "irm https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.ps1 | iex"
$UvDir = Join-Path $Root ".uv"
$VenvDir = Join-Path $Root ".venv"
$Arch = "x86_64-pc-windows-msvc"
$UvExe = Join-Path $UvDir "uv.exe"
$GitHome = Join-Path $Root (Join-Path ".tools" "git")  # .tools/git

function Get-MinGitPin {
    $procArch = $env:PROCESSOR_ARCHITECTURE
    if ($procArch -eq "ARM64") {
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

function Ensure-Gitignore {
    $gi = Join-Path $Root ".gitignore"
    if (-not (Test-Path -LiteralPath $gi)) {
        New-Item -ItemType File -Path $gi | Out-Null
    }
    $text = Get-Content -LiteralPath $gi -ErrorAction SilentlyContinue
    $lines = @()
    if ($text) { $lines = @($text) }
    foreach ($need in @(".venv/", ".uv/", ".tools/")) {
        if ($lines -notcontains $need) {
            Add-Content -LiteralPath $gi -Value $need
        }
    }
}

$installExitCode = 0
try {
    $GitBin = Install-PortableGit -HomeDir $GitHome

    $GitDir = Join-Path $Root ".git"
    if (-not (Test-Path -LiteralPath $GitDir)) {
        Write-Host "No .git here (zip extract). Bootstrapping onto export branch notebooks..."
        Write-Host "Keeping .venv / .uv / .tools."
        Ensure-Gitignore
        Invoke-PortableGit -GitBin $GitBin -- -C $Root init -q
        if ($LASTEXITCODE -ne 0) { throw "git init failed (exit $LASTEXITCODE)" }
        Invoke-PortableGit -GitBin $GitBin -- -C $Root remote get-url origin 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Invoke-PortableGit -GitBin $GitBin -- -C $Root remote add origin $OriginUrl
            if ($LASTEXITCODE -ne 0) { throw "git remote add failed (exit $LASTEXITCODE)" }
        }
        Invoke-PortableGit -GitBin $GitBin -- -C $Root fetch --depth 1 origin notebooks
        if ($LASTEXITCODE -ne 0) { throw "git fetch origin notebooks failed (exit $LASTEXITCODE)" }
        Invoke-PortableGit -GitBin $GitBin -- -C $Root checkout -f -B notebooks origin/notebooks
        if ($LASTEXITCODE -ne 0) { throw "git checkout notebooks failed (exit $LASTEXITCODE)" }
    } else {
        $branch = Invoke-PortableGit -GitBin $GitBin -- -C $Root rev-parse --abbrev-ref HEAD 2>$null
        $upstream = $null
        try {
            $bindir = Split-Path -Parent $GitBin
            $saved = $env:PATH
            $env:PATH = "$bindir;$saved"
            try {
                $upstream = & $GitBin -C $Root rev-parse --abbrev-ref "@{upstream}" 2>$null
            } finally {
                $env:PATH = $saved
            }
        } catch {
            $upstream = $null
        }
        $onNotebooks = ($branch -eq "notebooks") -or ($upstream -like "*/notebooks")
        if (-not $onNotebooks) {
            $got = if ($branch) { $branch } else { "detached" }
            throw "This folder tracks '$got', not notebooks. update.ps1 only tracks the notebooks export branch, not main. Re-get:`n  $CloneHint"
        }
        $porcelain = Invoke-PortableGit -GitBin $GitBin -- -C $Root status --porcelain
        if ($LASTEXITCODE -ne 0) {
            throw "git status failed (exit $LASTEXITCODE)"
        }
        if ($porcelain) {
            Write-Host $porcelain
            throw "Working tree is dirty. Stash or re-clone, then retry."
        }
        Write-Host "Pulling branch notebooks (ff-only)..."
        Invoke-PortableGit -GitBin $GitBin -- -C $Root pull --ff-only
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
        $Describe = Invoke-PortableGit -GitBin $GitBin -- -C $Root describe --tags --always 2>$null
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

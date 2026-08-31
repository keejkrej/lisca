# Register the Lisca kernel for JupyterHub.
# Does not start a notebook server: Hub already serves the UI.
# Scripts live under scripts/; pyproject.toml and install.ps1 sit at the bundle root.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = if (Test-Path -LiteralPath (Join-Path $PSScriptRoot "pyproject.toml")) {
    $PSScriptRoot
} else {
    Split-Path -Parent $PSScriptRoot
}

function Resolve-UvExe {
    $BundledUv = Join-Path $RepoRoot (Join-Path ".uv" "uv.exe")
    if (Test-Path -LiteralPath $BundledUv) {
        return $BundledUv
    }
    $Cmd = Get-Command uv -ErrorAction SilentlyContinue
    if ($Cmd) {
        return "uv"
    }
    return $null
}

function Test-Venv {
    $UnixPython = Join-Path $RepoRoot (Join-Path ".venv" (Join-Path "bin" "python"))
    $WinPython = Join-Path $RepoRoot (Join-Path ".venv" (Join-Path "Scripts" "python.exe"))
    return (Test-Path -LiteralPath $UnixPython) -or (Test-Path -LiteralPath $WinPython)
}

$NotebooksDir = Join-Path $RepoRoot "notebooks"
if (-not (Test-Path -LiteralPath $NotebooksDir)) {
    Write-Host "Notebooks folder not found: $NotebooksDir" -ForegroundColor Red
    exit 1
}

$UvExe = Resolve-UvExe
if (-not $UvExe -or -not (Test-Venv)) {
    $Install = Join-Path $PSScriptRoot "install.ps1"
    if (-not (Test-Path -LiteralPath $Install)) {
        $Install = Join-Path $RepoRoot "install.ps1"
    }
    if (Test-Path -LiteralPath $Install) {
        Write-Host "Setting up the environment (first run)..." -ForegroundColor Cyan
        & $Install
        if ($LASTEXITCODE -ne 0) {
            exit [int]$LASTEXITCODE
        }
    } elseif ($UvExe) {
        Write-Host "Setting up the environment (first run)..." -ForegroundColor Cyan
        & $UvExe sync --python 3.12 --extra notebook --directory $RepoRoot
        if ($LASTEXITCODE -ne 0) {
            exit [int]$LASTEXITCODE
        }
    } else {
        $BundledUv = Join-Path $RepoRoot (Join-Path ".uv" "uv.exe")
        Write-Host "Neither $BundledUv nor 'uv' on PATH was found. Run install.ps1 or install uv." -ForegroundColor Red
        exit 1
    }
    $UvExe = Resolve-UvExe
    if (-not $UvExe) {
        Write-Host "uv is still missing after install. Run install.ps1 or install uv." -ForegroundColor Red
        exit 1
    }
}

function Link-RepoInHome {
    $name = Split-Path -Leaf $RepoRoot
    $homeFull = [IO.Path]::GetFullPath($HOME)
    $repoFull = [IO.Path]::GetFullPath($RepoRoot)
    $repoParent = Split-Path -Parent $repoFull
    $script:HomeLinkName = $name
    $script:HomeLinkKind = ""

    if ($repoFull.TrimEnd('\') -eq $homeFull.TrimEnd('\') -or $repoParent.TrimEnd('\') -eq $homeFull.TrimEnd('\')) {
        $script:HomeLinkKind = "visible"
        return
    }

    $linkPath = Join-Path $homeFull $name
    if (Test-Path -LiteralPath $linkPath) {
        $existing = Get-Item -LiteralPath $linkPath
        $isSymlink = $existing.LinkType -eq "SymbolicLink"
        if (-not $isSymlink -and $existing.PSIsContainer) {
            Write-Host "Warning: $linkPath already exists as a directory; not replacing it with a symlink to $repoFull."
            return
        }
    }

    try {
        New-Item -ItemType SymbolicLink -Path $linkPath -Target $repoFull -Force | Out-Null
        $script:HomeLinkKind = "symlink"
    } catch {
        Write-Host "Skipping home symlink (not permitted): $linkPath"
    }
}

Push-Location $RepoRoot
try {
    Write-Host "Registering the Lisca kernel..." -ForegroundColor Cyan
    & $UvExe run --python 3.12 --extra notebook python -m ipykernel install --user --name lisca --display-name "Lisca"
    if ($LASTEXITCODE -ne 0) {
        exit [int]$LASTEXITCODE
    }
    $HomeLinkName = ""
    $HomeLinkKind = ""
    Link-RepoInHome
    Write-Host ""
    Write-Host "Done. Next steps:"
    Write-Host "  1. Refresh the browser tab (or open JupyterHub again)."
    if ($HomeLinkKind -eq "symlink") {
        Write-Host "  2. In the file tree, open ~/$HomeLinkName (symlink to the code folder)."
        Write-Host "  3. Open notebooks/crop.ipynb (then analyze.ipynb, then results.ipynb)."
        Write-Host "  4. Kernel menu: pick Lisca if it is not already selected."
        Write-Host "  5. In the Config cell, set WORKSPACE and SOURCE to the mounted data folder."
    } else {
        Write-Host "  2. Open notebooks/crop.ipynb (then analyze.ipynb, then results.ipynb)."
        Write-Host "  3. Kernel menu: pick Lisca if it is not already selected."
        Write-Host "  4. In the Config cell, set WORKSPACE and SOURCE to the mounted data folder."
    }
} finally {
    Pop-Location
}

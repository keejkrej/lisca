# Start Jupyter in the notebooks/ folder (local laptop).
# JupyterHub: use scripts/jupyter-hub.ps1 instead (do not start a second server).

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = if (Test-Path -LiteralPath (Join-Path $PSScriptRoot "pyproject.toml")) {
    $PSScriptRoot
} else {
    Split-Path -Parent $PSScriptRoot
}

$BundledUv = Join-Path $RepoRoot (Join-Path ".uv" "uv.exe")
if (Test-Path -LiteralPath $BundledUv) {
    $UvExe = $BundledUv
} elseif (Get-Command uv -ErrorAction SilentlyContinue) {
    $UvExe = "uv"
} else {
    Write-Host "Neither $BundledUv nor 'uv' on PATH was found. Run install.ps1 or install uv." -ForegroundColor Red
    exit 1
}

$NotebooksDir = Join-Path $RepoRoot "notebooks"
if (-not (Test-Path -LiteralPath $NotebooksDir)) {
    Write-Host "Notebooks folder not found: $NotebooksDir" -ForegroundColor Red
    exit 1
}

$UvDir = Join-Path $RepoRoot ".uv"
$env:UV_PYTHON_INSTALL_DIR = Join-Path $UvDir "python"
$env:UV_CACHE_DIR = Join-Path $UvDir "cache"
$env:UV_TOOL_DIR = Join-Path $UvDir "tools"
$env:UV_PYTHON_BIN_DIR = Join-Path $UvDir "bin"

Push-Location $RepoRoot
try {
    Write-Host "Starting Jupyter in: $NotebooksDir" -ForegroundColor Cyan
    & $UvExe run --python 3.12 --extra notebook jupyter notebook $NotebooksDir
    exit [int]$LASTEXITCODE
} finally {
    Pop-Location
}

# Lisca notebooks

This tree is the notebooks **export artifact**, equivalent to `lisca-notebooks-X.Y.Z.zip`. It is not a development branch, and it is not Studio, Aligner, Annotator, or the Lisca monorepo (`apps/`, `crates/`, …).

- All daily edits happen on **`main`** (and assay sidecars). Nobody hand-edits branch `notebooks`.
- The only writer of branch `notebooks` is the `notebooks-v*` release workflow: pack zip → GitHub Release → push that packed tree to `notebooks`. There is no sync from main merges or PRs.
- `update.sh` git-pulls this export branch; it does not pull `main`.

## Get

Preferred (git, then update in place):

```sh
git clone --branch notebooks --single-branch --depth 1 https://github.com/keejkrej/lisca.git lisca-notebooks
cd lisca-notebooks
bash install.sh
```

Airgapped / no-git: download `lisca-notebooks-X.Y.Z.zip` from a [`notebooks-v*`](https://github.com/keejkrej/lisca/releases) GitHub Release, extract it, then `bash install.sh`. Zip extracts cannot `git pull`; use a fresh zip or re-clone as above.

Do **not** clone `main` for Hub or laptop notebooks.

This export vendors Lisca crop (`vendor/lisca`, installed as `lisca[crop]`) and the transfection sidecar (`vendor/transfection`). `install.sh` / `install.ps1` only fetch third-party wheels from PyPI (numpy, pandas, matplotlib, nd2, pylibCZIrw, ipykernel, jupyter, …). They do not git-clone GitHub packages.

Crop lives in this repo’s Python package (`lisca[crop]`). Analyze and results use the `transfection` sidecar. Do not use a deprecated `pyama*` package.

## Install

macOS / Linux:

```sh
bash install.sh
```

Windows:

```powershell
.\install.ps1
```

That installs Python 3.12 and the notebook extra (`ipykernel`, `jupyter`) plus the vendored path packages:

- `lisca[crop]` from `vendor/lisca` (ND2/CZI crop)
- `transfection` from `vendor/transfection` (analyze / results)

## Update

From a git checkout of branch `notebooks`:

```sh
bash update.sh
```

Windows: `.\update.ps1`.

That runs `git pull --ff-only` on this export branch. It does not pull `main`. Then it runs the same `uv sync` as install. `.venv` is kept. Config cells in `notebooks/` may change on pull — re-check them.

If this folder has no `.git` (zip extract only), re-clone as in Get, or download a fresh zip. `VERSION` plus optional `git describe` tell you which export you have.

## JupyterHub

```sh
bash scripts/jupyter-hub.sh
```

Windows: `.\scripts\jupyter-hub.ps1`.

This registers the **Lisca** kernel (`lisca` / display name Lisca). It does **not** start a notebook server. If the extracted folder is not already under your home directory, it runs `ln -sfn` into `$HOME` (it will not replace a real directory of the same name).

Then:

1. Refresh the browser tab (or open JupyterHub again).
2. Open `notebooks/crop.ipynb`, then `analyze.ipynb`, then `results.ipynb`.
3. Kernel menu: pick **Lisca** if it is not already selected.
4. Edit the **Config** cell before running.

## Laptop

```sh
bash scripts/jupyter-notebook.sh
```

Windows: `.\scripts\jupyter-notebook.ps1`.

This starts Jupyter Notebook in the `notebooks/` folder.

## Config cells

Set these in the first code cell of each notebook. Paths are the mounted or local experiment folder, not this zip.

| Notebook        | Config                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `crop.ipynb`    | `WORKSPACE`, `SOURCE` (ND2/CZI), `POSITIONS` (zero-based; `range(0, 159)` is Pos 0..158)                        |
| `analyze.ipynb` | `WORKSPACE`, `INTERVAL_MINUTES`, `MAX_ONSET_MINUTES` (onset time t0 cap), `SIGNAL_CHANNEL` (one int, every Pos) |
| `results.ipynb` | `WORKSPACE`, `INTERVAL_MINUTES`, `SAMPLES` (names + positions). No `SIGNAL_CHANNEL`.                            |

`analyze.ipynb` writes `analysis/` CSVs only. `results.ipynb` writes `samples[]` into `assay.json`, then Tables (`traces.xlsx` / `auc.xlsx` / `fit.xlsx`) and Plots (per-sample PNGs and root boxplots) as separate cells. Re-run Plots without re-running Tables or analyze.

## Version

`VERSION` is the source of truth (this tree is `0.1.2`). Bump it on **`main`**. After merge, tag `notebooks-vX.Y.Z` on that main commit. The release job packs from the tag, attaches the zip, and exports this tree to branch `notebooks`. Desktop installers use a different train (`v*`) and are not in this export.

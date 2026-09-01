# Lisca notebooks

This tree is the notebooks **export artifact**, equivalent to `lisca-notebooks-X.Y.Z.zip`. It is not a development branch, and it is not Studio, Aligner, Annotator, or the Lisca monorepo (`apps/`, `crates/`, …).

- All daily edits happen on **`main`** (and assay sidecars). Nobody hand-edits branch `notebooks`.
- The only writer of branch `notebooks` is the notebooks release workflow: pack zip → push that packed tree to `notebooks` → tag `notebooks-vX.Y.Z` on that export commit → GitHub Release. There is no sync from main merges or PRs.
- `update.sh` always uses portable git under `.tools/git`. It pulls export branch `notebooks`; it does not pull `main`.

## Get

Preferred (clones branch `notebooks` into **`./lisca-notebooks`** under the current directory, then install):

```sh
curl -fsSL https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.sh | bash
```

Windows:

```powershell
irm https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.ps1 | iex
```

Optional folder name or path: `curl ... | bash -s -- my-notebooks`. Installs under PWD only — never `~/.local/share`, `~/Library`, or other user-global tool dirs. Always bootstraps portable git into `.tools/git` (does not use system git). `.uv` (uv binary and managed Python) and `.venv` stay in that folder. If the repo is private, set `GH_TOKEN` / `GITHUB_TOKEN`.

You can also clone directly:

```sh
git clone --branch notebooks --single-branch --depth 1 https://github.com/keejkrej/lisca.git lisca-notebooks
cd lisca-notebooks
bash install.sh
```

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

Always uses portable git under `.tools/git` (does not use system git). If this folder has no `.git`, `update.sh` bootstraps onto branch `notebooks` and keeps `.venv` / `.uv` / `.tools`.

```sh
bash update.sh
```

Windows: `.\update.ps1`.

Editing template notebooks is fine (Config cells in `crop.ipynb` / `analyze.ipynb` / `results.ipynb`). Update copies each dirty file under `notebooks/` to a sibling `*.bak-<UTC-timestamp>` (for example `notebooks/crop.ipynb.bak-20260901T130000Z`), then refreshes the templates from branch `notebooks`. Re-apply Config from the backup if needed. It does not pull `main`.

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

`VERSION` is the source of truth (this tree is `0.1.2`). Bump it on **`main`**. After merge, run notebooks-release `workflow_dispatch` with that SemVer. The job packs from main, publishes this tree to branch `notebooks`, and tags `notebooks-vX.Y.Z` on that **export** commit (not a main SHA). Desktop installers use a different train (`v*`) and are not in this export.

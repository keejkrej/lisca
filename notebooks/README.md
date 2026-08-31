# Lisca notebooks

Download the zip from [GitHub Releases](https://github.com/keejkrej/lisca/releases) on a `notebooks-v*` tag. Extract it and run the launchers from this folder.

Do **not** clone the Lisca monorepo. Hub and laptop users only need this zip. It is not a Studio, Aligner, or Annotator installer.

## Install

macOS / Linux:

```sh
bash install.sh
```

Windows:

```powershell
.\install.ps1
```

That installs Python 3.12 and the notebook extra (`ipykernel`, `jupyter`) plus `pyama` from git. Crop and analysis stay in `pyama`; this zip does not vendor the monorepo.

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

| Notebook | Config |
| --- | --- |
| `crop.ipynb` | `WORKSPACE`, `SOURCE` (ND2/CZI), `POSITIONS` (zero-based; `range(0, 159)` is Pos 0..158) |
| `analyze.ipynb` | `WORKSPACE`, `INTERVAL_MINUTES`, `MAX_ONSET_MINUTES`, `SIGNAL_CHANNEL` (one int, every Pos) |
| `results.ipynb` | `WORKSPACE`, `INTERVAL_MINUTES`, `SAMPLES` (names + positions). No `SIGNAL_CHANNEL`. |

`analyze.ipynb` writes `analysis/` CSVs only. `results.ipynb` packs `results/{sample}/` (XLSX + PNG). Re-run results without repeating analyze.

## Version

`VERSION` is the source of truth (this tree is `0.1.0`). Git tags are `notebooks-vX.Y.Z`. Desktop installers use a different train (`v*`) and are not in this zip.

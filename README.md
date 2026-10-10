# LiSCA

Live-cell single-cell analysis for time-lapse microscopy of cells on micropattern arrays. LiSCA reads an acquisition — a Nikon ND2 file, a Zeiss CZI file, or a templated image folder — and keeps one workspace for alignment, ROI crops, annotations, and per-cell assay results.

Three apps share that workspace:

- **Studio** runs the experiment end to end: setup, alignment, annotation, and assay analysis with summary tables and plots.
- **Aligner** fits each field to the micropattern grid and writes ROI boxes.
- **Annotator** outlines cells and assigns phenotype labels on those ROIs.

Studio includes the Aligner and Annotator flows. GitHub Releases publish Studio installers.

## Repository

pnpm, Vite+, and Cargo monorepo.

| Path | Contents |
| --- | --- |
| `apps/{aligner,annotator,studio}/` | SolidJS `web/`, Rust `server/`, Tauri `desktop/`, and demos |
| `packages/` | TypeScript contracts, client, UI, and workspace fixtures |
| `crates/` | Rust libraries, including the `lisca-analyze` and `lisca-crop` binaries |
| `python/` | ROI crop, dataset building, and training |
| `notebooks/` | Jupyter export for Hub and local zip users (tags `notebooks-v*`) |
| `models/` | Product models (Smart exclude, Smart segment) |
| `docs/` | Domain notes and ADRs |

Assay weights (the transfection pattern U-Net, the killing ResNet) live with the assay repositories and on Hugging Face. See `models/README.md`.

## Related repositories

Assay science and the microscopy readers are public sibling repositories under [keejkrej](https://github.com/keejkrej). This repo pins the assay crates, and the transfection Python package, by git revision in `Cargo.toml` and `python/pyproject.toml`.

| Repository | What it owns |
| --- | --- |
| [lisca-transfection-assay](https://github.com/keejkrej/lisca-transfection-assay) | Transfection analysis: Python `transfection` and Rust `lisca-transfection` (segment, traces, AUC, fit, plots), plus the Python/Rust parity tests |
| [lisca-killing-assay](https://github.com/keejkrej/lisca-killing-assay) | Death-reporter fluorescence, fluorescent engagement, and the killing classifier. Rust crate `lisca-killing` |
| [mplot-rs](https://github.com/keejkrej/mplot-rs) | Rust 2D plotting (`mplot`). Analysis figures are rendered with this crate |
| [czi-rs](https://github.com/keejkrej/czi-rs) | Zeiss CZI reader |
| [nd2-rs](https://github.com/keejkrej/nd2-rs) | Nikon ND2 reader |
| [mlab-rs](https://github.com/keejkrej/mlab-rs) | Pure-Rust scientific computing: array, signal, image, and classical ML modules in the NumPy / SciPy style |

## Install

Node.js 24, pnpm 12.5.1, and a stable Rust toolchain. `.mise.toml` pins Node and pnpm. The Python package needs [uv](https://docs.astral.sh/uv/) and Python 3.11 or newer.

```sh
git clone https://github.com/keejkrej/lisca.git
cd lisca
pnpm install
```

On Linux, the Tauri shells and plot fonts need `pkg-config`, OpenSSL, GTK 3, WebKitGTK 4.1, librsvg, and fontconfig. `.github/workflows/checks.yml` is the list the CI image installs.

Python crop and training tools:

```sh
cd python
uv sync --extra crop
```

`uv sync --extra analysis` also installs the transfection package. `uv sync --group train` adds the training stack. Details are in `python/README.md`.

## Use

Start Studio's web UI and Rust server:

```sh
pnpm run dev:studio
```

Studio listens on port 18767, Aligner on 18765, and Annotator on 18766. Each app's Rust server listens on that port plus 1000.

```sh
pnpm run dev:aligner
pnpm run dev:annotator
pnpm run dev:studio-desktop
```

Package a desktop installer. An unnamed product packages Studio:

```sh
pnpm run dist:studio
pnpm run dist:aligner
pnpm run dist:annotator
```

Release tags publish Studio only. See `docs/agents/releases.md`.

Analysis demo, fixture plots and no workspace:

```sh
pnpm run dev:studio-demo
```

That serves [http://localhost:5177](http://localhost:5177). See `apps/studio/demo/README.md`.

Materialize a sample workspace at a pipeline stage:

```sh
pnpm run fixture:workspace -- --assay transfection --stage cropped --out ./tf-analyze
```

See `packages/fixtures/README.md`.

Run an assay on a workspace. Transfection stages call `lisca-transfection`. The killing commands call `lisca-killing` and require a matching `assay.json` type. Classifier training stays in `lisca-killing-assay`.

```sh
cargo run -p lisca --bin lisca-analyze -- --help
cargo run -p lisca --bin lisca-analyze -- pipeline WORKSPACE
cargo run -p lisca --bin lisca-analyze -- killing-death-reporter WORKSPACE
cargo run -p lisca --bin lisca-analyze -- killing-engagement WORKSPACE
```

Crop an ND2 or CZI source into `roi/`:

```sh
cd python
uv run lisca crop --workspace WORKSPACE --source SOURCE.nd2 --positions 0,1,2
```

The Rust crop binary follows the same server path:

```sh
cargo run -p lisca --bin lisca-crop --no-default-features -- --workspace WORKSPACE --source SOURCE.nd2
```

Notebooks for JupyterHub or a laptop zip come from the `notebooks` branch:

```sh
curl -fsSL https://raw.githubusercontent.com/keejkrej/lisca/main/scripts/get-notebooks.sh | bash
```

See `notebooks/README.md`.

## Check

```sh
pnpm run check
cd python && uv run pytest
```

`pnpm run check` runs lint, TypeScript, contract generation, Rust check and Clippy, and the workspace tests. `pnpm run fmt` formats the JavaScript and TypeScript tree.

Domain language is in `CONTEXT.md`. Decisions are in `docs/adr/`. Analysis layout is in `docs/analysis/analysis.md`.

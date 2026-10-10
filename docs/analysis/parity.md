# Assay parity: Python goal sources → production pipelines

## Why this exists

Most **analysis science** is developed outside this monorepo, in focused
`lisca-*-assay` packages. Once a package is **mature** (stable library surface:
workspace paths, CSV columns, and scientific definitions, trusted on real
experiments), this repo **imports** it rather than keeping a second copy of the
pipeline. Once Studio enables the assay, `lisca-analyze` grows one command
named for the product. Transfection's stage CLI is the historical shape for
that assay only. Killing (death reporter) is `killing-death-reporter` on
`lisca-analyze` and in `assay.json`.

| Sibling package (R&D + prod kernels)                                               | Role                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`lisca-transfection-assay`](https://github.com/keejkrej/lisca-transfection-assay) | Transfection analysis: Python `transfection` + Rust `lisca-transfection` (git URL). Parity: that repo’s [`docs/parity.md`](https://github.com/keejkrej/lisca-transfection-assay/blob/main/docs/parity.md). |
| [`lisca-killing-assay`](https://github.com/keejkrej/lisca-killing-assay)           | Death-reporter fluorescence, fluorescent engagement, and the killing classifier (predict, clean, kill curve): Python `killing` + Rust `lisca-killing` (git URL). Label-free viability stays in that repo too. |
| `lisca-binding-assay` (planned)                                                    | Binding / LNP-style assays before Studio registration                                                                                                                                                      |

**Crop** (`lisca-crop`, ND2/CZI, bbox → `roi/`) stays in this monorepo. It is
shared across assays and is not part of `lisca-transfection-assay`.

**Models** (see [`models/README.md`](../../models/README.md)):

| Stay in this repo (product / any-assay)    | Assay brains (HF / sidecar; not long-term `models/` ownership)                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Smart exclude (`smart-exclusion-resnet18`) | Transfection pattern U-Net: HF `keejkrej/single-cell-pattern-unet`, `LISCA_PATTERN_SEG_MODEL`                 |
| Smart segment (`smart-segment-slimsam`)    | Killing ResNet: HF `keejkrej/killing-assay-resnet18`; local cache or `LISCA_KILL_MODEL`, not in the installer |
| `mupattern-resnet18` (legacy reference)    | Do not add new assay-specific weights under `models/`                                                         |

Studio still hosts a **transfection ONNX segment adapter** (`segment_onnx.rs`)
until `lisca-transfection` un-stubs its ONNX backend. That adapter must resolve
weights from the env var / HF, not treat `models/single-cell-pattern-unet` as
the product brain. The sidecar’s ONNX backend is a stub; Otsu is its
Python-parity default.

Day-to-day Studio chart wiring stays in [`analysis.md`](./analysis.md). Agent
workflow: [`/lisca-parity`](../../.agents/skills/lisca-parity/SKILL.md).

## Roles

| Layer                                             | Responsibility                                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Goal source** (Python `lisca-*-assay`)                 | Scientific definitions, output paths, CSV columns, and plot names. Flags in this file are transfection stage flags. |
| **Imported crate** (`lisca-transfection`, `lisca-killing`) | Idiomatic Rust kernels. Studio and `lisca-analyze` call the crate.                                                                                    |
| **In-tree port** (`crates/lisca`)                        | Crop, plus killing dispatch and plots.                                                                                                                 |
| **Parity cage**                                          | Transfection shell-out tests stay in the sidecar. Killing unit tests are `pytest` and `cargo test -p lisca-killing` in the side repo, plus the Lisca dispatch tests. Killing does not gain a shell-out cage. |
| **Studio UI** (`@lisca/analysis`, Studio web)     | Consume workspace outputs; chart catalogs must match file/column contracts          |

**Not required:** matching Python module trees, NumPy evaluation order, process
pools, or bitwise float identity.

## Lifecycle

```
 explore in lisca-*-assay (library: Python core/services + Rust crate)
        │
        ▼
 stabilize workspace I/O and scientific definitions on real data
        │
        ▼
 port goals → sidecar crate
        │
        ▼
 this monorepo depends on the crate via git URL (no cycle back to lisca)
        │
        ▼
 Studio / contracts only after the library is green
```

1. **Develop the library** until semantics and I/O are trusted.
2. **Port to Rust** in the assay sidecar crate.
3. **Prove parity** by importing functions (synthetic + real workspace). This
   repo should not keep a second full pipeline.
4. **Wire Studio** only after contract + scientific parity hold.
5. **Transfection only.** Keep Python as the oracle in that sidecar:
   `uv run transfection …` vs `lisca-analyze` / `lisca-transfection`’s own
   `lisca-analyze`. That shell-out is not the killing oracle and not the rule
   for the next assay.

## Assay map

| Studio `assayId`                                        | Goal source + Rust                                                           | This repo                                                             | Parity CLI                            | Notes                                                              |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `transfection` (Studio wire id; science = transfection) | `lisca-transfection-assay` (`transfection` CLI + `lisca-transfection` crate) | Thin dispatch in `analysis/assays/transfection/` + local ONNX segment | `lisca-analyze` (calls the git crate) | Crop stays here. Python+Rust parity: sidecar `docs/parity.md`.     |
| `killing-death-reporter`                                | `lisca-killing-assay` (`lisca-killing` + `killing.core` / `killing.services`) | Thin dispatch and plots in `analysis/assays/killing/` | `lisca-analyze killing-death-reporter` | Per-cell traces and sample-mean figures. The command and `assay.json` type are both `killing-death-reporter`. Analyze does not run the classifier. The kill curve is `lisca_killing::run_clean` / `killing.services.classifier.run_clean`, library only. |
| `killing-engagement`                                    | `lisca-killing-assay` (`lisca-killing` + `killing.core` / `killing.services`) | Thin dispatch and plots in `analysis/assays/killing_engagement.rs` | `lisca-analyze killing-engagement` | Spot counts. Tumor touch is recorded and is not proof of contact. |
| `lnp-binding` / binding                                 | future `lisca-binding-assay`                                                 | none until mature                                                     | —                                     | Closed enum: do not half-register                                  |

Adding a Studio assay id is a **cross-cutting** change (`@lisca/contracts`,
Rust, generated types). Unsupported ids fail explicitly — see `PRODUCT.md`.

Cargo (this workspace):

```toml
lisca-transfection = { git = "https://github.com/keejkrej/lisca-transfection-assay", rev = "9eda2a7dd62c73cc8fd36071762a043f436462db" }
lisca-killing = { git = "https://github.com/keejkrej/lisca-killing-assay", rev = "75861fafe9ca671cb98f4a3a9df89918a3d6d9c4" }
```

Python extra (`python/pyproject.toml`, `analysis` extra):

```toml
transfection = { git = "https://github.com/keejkrej/lisca-transfection-assay", rev = "9eda2a7dd62c73cc8fd36071762a043f436462db" }
```

Keep transfection Cargo and Python on the **same SHA**. Lock files (`Cargo.lock`,
`python/uv.lock`) must match. Notebooks vendor sync reads that SHA.
`lisca-killing` is Rust-only from this repo. `killing` also ships the
label-free training stack, so LiSCA does not add it as a Python extra. Run
the training tool in `lisca-killing-assay` at the pinned SHA if you are
training; run `lisca-analyze` if you are measuring a workspace.

The sidecar crate must **not** depend on crate `lisca` (that would cycle:
`lisca` already depends on `lisca-transfection`). It **may** git-depend on
`lisca-workspace` in this repo for folder names and bbox/ROI path helpers.
The `lisca-transfection` public API is workspace-path based: `run_segment`,
`run_traces`, `run_auc`, `run_fit`, `run_pipeline`, `run_plot_*` (PNG only),
`publish_sample_*_xlsx`, `load_assay_for_workspace`. The killing crate surface
the product calls is `run_fluorescence`, `run_position_fluorescence`,
`run_position_engagement`, and `write_engagement_summary`. `run_predict_to`
and `run_clean` stay library functions and are not `lisca-analyze` commands.

### ndarray / imageproc versions

`lisca-transfection` currently uses ndarray 0.16 and imageproc 0.25; this
workspace uses ndarray 0.17. Callers must use the crate’s
workspace-path API and mapping conversion so ndarray types are not unified
across the boundary. Cargo may compile both ndarray versions (duplicate
crates); do not silently rewrite the sidecar to match this workspace.

## What “parity” means

### Contract parity

- Workspace layout: folder names + bbox/ROI files owned here
  ([`schema.md`](./schema.md)). Transfection analysis/results **columns** are
  owned by the sidecar. Killing kernels are the git crate at the pinned SHA.
  In-tree code is dispatch, plots, crop, scheduling, and progress. The crate
  writes fluorescence CSVs, `engagement.csv`, `engagement_summary.csv`, and
  the engagement workbooks. Lisca writes every PNG and the death-reporter
  `traces.xlsx`.
- Trace columns (`analysis/Pos{n}/ch{m}.csv`): `roi,t,area,background,sum,corrected` (no `pos` /
  `sample`; joined later from path + sample mapping). `background`
  and `sum` are QC columns. `t` uses `index.json` `timeIndices`. Segmented
  bg = median of `~mask`; `analysis.skipSegment` bg = 10th percentile.
- Slim `index.json`: always `TCZYX`; keep `zCount`; drop `source` /
  `pageOrder` / per-ROI `shape` (derive from counts + bbox).
- Output basenames Studio and Python both expect (`analysis/PosN/auc.csv`,
  `fit.csv`, `results/<sample>/traces.png`, workspace `auc.png`, …).
- Analysis AUC / fit identity columns: `roi` (`channel` on auc/fit only when
  a Pos has more than one signal channel). Fit public columns:
  `baseline_intensity`, `onset_time`, `expression_rate`, `mrna_lifetime`,
  `protein_lifetime`, `success`. Results XLSX prefix `pos` only (no
  `sample`; the pack lives under `results/<sample>/`).
  Column contract: [`schema.md`](./schema.md).
- Stage order for full pipelines (`transfection pipeline` / `lisca-analyze pipeline`).
- Flag defaults that change science (`--interval`, `--max-onset-minutes`,
  `analysis.skipSegment`, segmentation radius/sigma).

### Scientific parity

Same definitions, within tolerances. **Transfection tolerances are owned by
the sidecar** ([`docs/parity.md`](https://github.com/keejkrej/lisca-transfection-assay/blob/main/docs/parity.md)):

| Quantity                                       | Typical relative tolerance                        | Where locked                                  |
| ---------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Masked intensity / background / corrected      | `1e-6`                                            | sidecar + this repo’s synthetic wrapper tests |
| Trapezoidal AUC                                | `1e-6`                                            | sidecar + AUC stage                           |
| Kinetic fit params (Rust reference kernel)     | `1e-5`                                            | sidecar synthetic fit test                    |
| Kinetic fit vs Python CLI (real/synthetic e2e) | `2e-2` (aim much tighter after kernel bugs fixed) | sidecar CLI test + real workspace             |

Use relative error `|a−b| / max(|a|,|b|,ε)`. Report p50/p90/p99/max and
success-flag mismatches before changing code. Kernel fixes belong in
`lisca-transfection-assay`, not a fork under `crates/lisca`.

### Explicit non-goals

- Identical floating evaluation order or BLAS/LAPACK identity.
- Matching Python packaging, Typer apps, or process-pool shape.
- PNG pixel-identical plots (layout constants should match; visual QA is
  secondary to CSV science).

## Parity CLI

Rust stages must stay invocable **without** the Studio HTTP server so agents
and humans can run differential loops.

### Transfection: `lisca-analyze`

This binary lives in the `lisca` crate and **calls `lisca-transfection`**.
Otsu segment / traces / AUC / fit / plots come from the git crate. `--backend onnx`
uses the local Studio ONNX segmenter.

```sh
cargo build -p lisca --release --bin lisca-analyze
./target/release/lisca-analyze --help
```

Stage names mirror `transfection`:

| Command                                 | Writes                                                                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `segment`                               | `mask/PosN/*.tif` (default Otsu via git crate; optional ONNX U-Net in this repo)                                                                                                            |
| `traces`                                | `analysis/Pos*/ch*.csv` (CSV only)                                                                                                                                                          |
| `auc`                                   | `analysis/Pos*/auc.csv`                                                                                                                                                                     |
| `fit`                                   | `analysis/Pos*/fit.csv`                                                                                                                                                                     |
| `plot-traces` / `plot-auc` / `plot-fit` | PNG packs + workspace boxplots. CLI/`pipeline` call `publish_sample_*_xlsx` first so one-shot still writes `results/<sample>/{traces,auc,fit}.xlsx`. Plot services themselves are PNG-only. |
| `pipeline` (`analyze`, `all`)           | full Studio order from `assay.json`                                                                                                                                                         |

Common flags: `--assay` (default `<workspace>/assay.json`), `--interval`,
`--max-onset-minutes`, segment `--force` / radius / sigma. Parallel stages
always use available CPU cores (no `--jobs` on Python or `lisca-analyze`).

Details and examples: [`analysis.md`](./analysis.md) § Parity CLI.

### Killing: `lisca-analyze`

`killing-death-reporter` and `killing-engagement` take a workspace path and
nothing else. Interval and assay type come from `assay.json`.
`killing-death-reporter` requires type `killing-death-reporter`. `--interval`, `--assay`, and
any other flag exit 1. There is no `fluorescence`, `clean`, `predict`, or
`label-free` command. `killing` alone is neither a command nor an assay id.

| Command | Writes |
| --- | --- |
| `killing-death-reporter` | Fluorescence CSVs, `results/<sample>/traces.xlsx`, and `traces.png`, `traces_shared_y.png`, `traces_summary.png`, `traces_summary_shared_y.png` |
| `killing-engagement` | `analysis/Pos{n}/engagement.csv`, `analysis/Pos{n}/engagement_summary.csv`, the engagement workbooks, and `engagement_traces.png`, `engagement_traces_shared_y.png`, `engagement_traces_summary.png`, `engagement_traces_summary_shared_y.png` |

```sh
./target/release/lisca-analyze killing-death-reporter ~/data/killing_pi
./target/release/lisca-analyze killing-engagement ~/data/killing_tcell
```

### Side-by-side recipe

The block below is the transfection legacy oracle, not the pattern for killing.
Prefer the sidecar’s own recipe when comparing transfection Python vs Rust
kernels. From this repo, `lisca-analyze` should match `lisca-transfection`
because it calls that crate:

```sh
WS=~/data/TF84
INTERVAL=10

# 1) golden (sidecar Python)
uv run --directory ../lisca-transfection-assay \
  transfection auc "$WS"
mkdir -p /tmp/TF84-python-golden
cp "$WS/analysis/Pos1/auc.csv" /tmp/TF84-python-golden/

# 2) candidate (this repo → git crate)
./target/release/lisca-analyze auc "$WS" --interval "$INTERVAL"

# 3) compare (keys + relative tolerance)
# join on roi (pos is the analysis/PosN folder) — see sidecar docs/parity.md
```

Backup entire `analysis/` + `results/` before a full re-run.

## Tests in this repo

| Lane                | Command                                                       | Purpose                                                           |
| ------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| Always-on synthetic | `cargo test -p lisca --test transfection_parity`              | Tiny workspace; wrapper still writes sidecar CSVs                 |
| Optional Python e2e | `cargo test -p lisca --test transfection_parity -- --ignored` | Needs `../lisca-transfection-assay` (or `../transfection`) + `uv` |
| Library units       | `cargo test -p lisca --lib`                                   | Shared kernels (`array.rs`, sample mapping, ONNX helpers)         |
| Sidecar parity      | in `lisca-transfection-assay`                                 | Canonical Python vs Rust CSV cage                                 |

Support kernels for tests: `crates/lisca/tests/support/transfection_reference.rs`
(goal formulas for the wrapper tests, not a second production path).

## Design stance for ports

- Transfection science: **`lisca-transfection`** (git). Do not copy the
  pipeline back into `assays/transfection/` beyond dispatch + Studio ONNX
  adapter. Pattern-U-Net weights are the sidecar/HF’s, not a new `models/`
  brain.
- Shared ROI I/O in this crate: `analysis/roi_stack.rs`, `csv_io.rs`, crop.
- Killing: kernels are crate `lisca-killing` at the pinned SHA. This repo keeps
  dispatch, plots, and scheduling. Death-reporter fluorescence and
  fluorescent-engagement spot counts are plotted with mplot-rs. Analyze does not
  load a classifier. Desktop packaging does not download or bundle ONNX weights.
- Progress + HTTP remain in Studio; parity CLI calls the same stage functions.

Sibling repos describe **goals** and, once imported, **own the kernels**.
They are not a licence to transliterate Python line-by-line.

## Expanding parity to a new assay

1. Mature the science in `lisca-*-assay` (library code plus real data, and a
   local training tool only when the assay needs one), including a Rust crate
   when ready to import.
2. Depend on that crate via git URL (no cycle back to this repo). Keep crop
   here until it is truly shared infrastructure.
3. Register in `assays.rs` + contracts enum when ready for Studio.
4. Extend `lisca-analyze` with one command per enabled assay. The command
   names the product and takes a workspace path only. Killing (death reporter)
   is `killing-death-reporter`, which is also the `assay.json` type.
5. Run synthetic + one real workspace differential before enabling in
   `ENABLED_STUDIO_ASSAY_IDS`.

## Related docs

- Studio analysis layout and chart packages: [`analysis.md`](./analysis.md)
- Product assay non-goals / closed enum: [`PRODUCT.md`](../../PRODUCT.md)
- Domain language: [`CONTEXT.md`](../../CONTEXT.md)
- Agent skill: [`.agents/skills/lisca-parity/SKILL.md`](../../.agents/skills/lisca-parity/SKILL.md)
- Sidecar parity: [lisca-transfection-assay `docs/parity.md`](https://github.com/keejkrej/lisca-transfection-assay/blob/main/docs/parity.md)

# Assay parity: Python goal sources → production pipelines

## Why this exists

Most **analysis science** is developed outside this monorepo, in focused
`lisca-*-assay` packages. Once a package is **mature** (stable CLI, stable
workspace layout, trusted on real experiments), this repo **imports** it rather
than keeping a second copy of the pipeline.

| Sibling package (R&D + prod kernels)                                  | Role                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`lisca-transfection-assay`](https://github.com/keejkrej/lisca-transfection-assay) | Transfection analysis: Python `transfection` + Rust `lisca-transfection` (git URL). Parity: that repo’s [`docs/parity.md`](https://github.com/keejkrej/lisca-transfection-assay/blob/main/docs/parity.md). |
| `lisca-killing-assay` (planned / external goals via mupattern)        | Killing survival / kill-curve science (Rust still in-tree here)                 |
| `lisca-binding-assay` (planned)                                       | Binding / LNP-style assays before Studio registration                           |

**Crop** (`lisca-crop`, ND2/CZI, bbox → `roi/`) stays in this monorepo. It is
shared across assays and is not part of `lisca-transfection-assay`.

Studio ONNX / smart segment also stays here. The sidecar crate’s ONNX backend
is a stub; Otsu is its Python-parity default.

Day-to-day Studio chart wiring stays in [`analysis.md`](./analysis.md). Agent
workflow: [`/lisca-parity`](../../.agents/skills/lisca-parity/SKILL.md).

## Roles

| Layer                                              | Responsibility                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Goal source** (Python `lisca-*-assay`)           | Define stages, flags, output paths, CSV columns, plot names, scientific definitions |
| **Imported crate** (`lisca-transfection` git dep)  | Idiomatic Rust for transfection stages; Studio and `lisca-analyze` call it          |
| **In-tree port** (`crates/lisca` killing, crop)    | Pipelines that do not yet have a sidecar crate                                      |
| **Parity cage**                                    | Transfection: tests in the sidecar repo. Killing: tests here.                       |
| **Studio UI** (`@lisca/analysis`, Studio web)      | Consume workspace outputs; chart catalogs must match file/column contracts          |

**Not required:** matching Python module trees, NumPy evaluation order, process
pools, or bitwise float identity.

## Lifecycle

```
 explore in lisca-*-assay (Python CLI)
        │
        ▼
 stabilize stages + workspace I/O on real data
        │
        ▼
 port goals → sidecar crate (transfection) or crates/lisca assays/<name>/
        │
        ▼
 this monorepo depends on the crate via git URL (no cycle back to lisca)
        │
        ▼
 Studio / contracts only after stages green
```

1. **Develop in Python** until stage semantics and I/O are trusted.
2. **Port to Rust** in the assay sidecar (preferred) or under `crates/lisca`
   until a sidecar exists.
3. **Prove parity** in the sidecar (synthetic + real workspace). This repo
   should not keep a second full transfection pipeline.
4. **Wire Studio** only after contract + scientific parity hold.
5. **Keep Python** as the oracle in the sidecar: `uv run transfection …` vs
   `lisca-analyze` / `lisca-transfection`’s own `lisca-analyze`.

## Assay map

| Studio `assayId`                                        | Goal source + Rust                                              | This repo                                                         | Parity CLI                        | Notes                                             |
| ------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------- | ------------------------------------------------- |
| `transfection` (Studio wire id; science = transfection) | `lisca-transfection-assay` (`transfection` CLI + `lisca-transfection` crate) | Thin dispatch in `analysis/assays/transfection/` + local ONNX segment | `lisca-analyze` (calls the git crate) | Crop stays here. Python+Rust parity: sidecar `docs/parity.md`. |
| `killing`                                               | mupattern / future `lisca-killing-assay`                        | `analysis/assays/killing/`                                        | extend when stages need stage-CLI | ONNX ResNet + kill-curve tables                   |
| `lnp-binding` / binding                                 | future `lisca-binding-assay`                                    | none until mature                                                 | —                                 | Closed enum: do not half-register                 |

Adding a Studio assay id is a **cross-cutting** change (`@lisca/contracts`,
Rust, generated types). Unsupported ids fail explicitly — see `PRODUCT.md`.

Cargo (this workspace):

```toml
lisca-transfection = { git = "https://github.com/keejkrej/lisca-transfection-assay" }
```

Python extra (`python/pyproject.toml`, `analysis` extra):

```toml
transfection = { git = "https://github.com/keejkrej/lisca-transfection-assay" }
```

The sidecar crate does **not** depend on this repo (that would cycle). Public
API is workspace-path based: `run_segment`, `run_timeseries`, `run_auc`,
`run_fit`, `run_pipeline`, `run_plot_*`, `load_assay_for_workspace`.

### ndarray / imageproc versions

`lisca-transfection` currently uses ndarray 0.16 and imageproc 0.25; this
workspace uses ndarray 0.17. Callers must use the crate’s
workspace-path API and mapping conversion so ndarray types are not unified
across the boundary. Cargo may compile both ndarray versions (duplicate
crates); do not silently rewrite the sidecar to match this workspace.

## What “parity” means

### Contract parity

- Workspace layout: `assay.json`, `roi/PosN/`, `mask/PosN/`,
  `timeseries/Pos{n}/ch{n}.csv`, `results/` (no `slide.json`).
- Timeseries columns: `roi,t,area,background,sum,corrected` (no `pos` /
  `slide_channel`; joined later from path + assay mapping). `t` uses
  `index.json` `timeIndices`. Segmented bg = median of `~mask`;
  `analysis.skipSegment` bg = 10th percentile.
- Slim `index.json`: always `TCZYX`; keep `zCount`; drop `source` /
  `pageOrder` / per-ROI `shape` (derive from counts + bbox).
- Output basenames Studio and Python both expect (`auc.csv`, `fit.csv`,
  `traces.png`, …).
- AUC / fit identity columns: `slide_channel,pos,roi` (sidecar contract;
  plots accept a legacy `slide` alias).
- Stage order for full pipelines (`transfection pipeline` / `lisca-analyze pipeline`).
- Flag defaults that change science (`--interval`, `--max-onset-minutes`,
  `analysis.skipSegment`, segmentation radius/sigma).

### Scientific parity

Same definitions, within tolerances. **Transfection tolerances are owned by
the sidecar** ([`docs/parity.md`](https://github.com/keejkrej/lisca-transfection-assay/blob/main/docs/parity.md)):

| Quantity                                       | Typical relative tolerance                        | Where locked                      |
| ---------------------------------------------- | ------------------------------------------------- | --------------------------------- |
| Masked intensity / background / corrected      | `1e-6`                                            | sidecar + this repo’s synthetic wrapper tests |
| Trapezoidal AUC                                | `1e-6`                                            | sidecar + AUC stage               |
| Kinetic fit params (Rust reference kernel)     | `1e-5`                                            | sidecar synthetic fit test        |
| Kinetic fit vs Python CLI (real/synthetic e2e) | `2e-2` (aim much tighter after kernel bugs fixed) | sidecar CLI test + real workspace |

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
Otsu segment / timeseries / AUC / fit / plots come from the git crate. `--backend onnx`
uses the local Studio ONNX segmenter.

```sh
cargo build -p lisca --release --bin lisca-analyze
./target/release/lisca-analyze --help
```

Stage names mirror `transfection`:

| Command                                     | Writes                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `segment`                                   | `mask/PosN/*.tif` (default Otsu via git crate; optional ONNX U-Net in this repo)    |
| `timeseries`                                | `timeseries/Pos*/ch*.csv` (+ xlsx)                                                  |
| `auc`                                       | `results/auc.csv`                                                                   |
| `fit`                                       | `results/fit.csv`                                                                   |
| `plot-timeseries` / `plot-auc` / `plot-fit` | `results/*.png` (timeseries includes summary mean/median/IQR + shared-y companions) |
| `pipeline` (`analyze`, `all`)               | full Studio order from `assay.json`                                                 |

Common flags: `--assay` (default `<workspace>/assay.json`), `--interval`,
`--max-onset-minutes`, segment `--force` / radius / sigma. Parallel stages
always use available CPU cores (no `--jobs` on Python or `lisca-analyze`).

Details and examples: [`analysis.md`](./analysis.md) § Parity CLI.

### Side-by-side recipe

Prefer the sidecar’s own recipe when comparing Python vs Rust kernels. From
this repo, `lisca-analyze` should match `lisca-transfection` because it calls
that crate:

```sh
WS=~/data/TF84
INTERVAL=10

# 1) golden (sidecar Python)
uv run --directory ../lisca-transfection-assay \
  transfection auc "$WS"
mkdir -p /tmp/TF84-python-golden
cp "$WS/results/auc.csv" /tmp/TF84-python-golden/

# 2) candidate (this repo → git crate)
./target/release/lisca-analyze auc "$WS" --interval "$INTERVAL"

# 3) compare (keys + relative tolerance)
# join on slide_channel,pos,roi — see sidecar docs/parity.md
```

Backup entire `results/` + `timeseries/` before a full re-run.

## Tests in this repo

| Lane                | Command                                                       | Purpose                                                           |
| ------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| Always-on synthetic | `cargo test -p lisca --test transfection_parity`              | Tiny workspace; wrapper still writes sidecar CSVs                 |
| Optional Python e2e | `cargo test -p lisca --test transfection_parity -- --ignored` | Needs `../lisca-transfection-assay` (or `../transfection`) + `uv` |
| Library units       | `cargo test -p lisca --lib`                                   | Shared kernels (`array.rs`, slide mapping, ONNX helpers)          |
| Sidecar parity      | in `lisca-transfection-assay`                                 | Canonical Python vs Rust CSV cage                                 |

Support kernels for tests: `crates/lisca/tests/support/transfection_reference.rs`
(goal formulas for the wrapper tests, not a second production path).

## Design stance for ports

- Transfection science: **`lisca-transfection`** (git). Do not copy the
  pipeline back into `assays/transfection/` beyond dispatch + Studio ONNX.
- Shared ROI I/O in this crate: `analysis/roi_stack.rs`, `csv_io.rs`, crop.
- Killing (in-tree until its sidecar exists): ONNX (`ort`) + mplot-rs.
- Progress + HTTP remain in Studio; parity CLI calls the same stage functions.

Sibling repos describe **goals** and, once imported, **own the kernels**.
They are not a licence to transliterate Python line-by-line.

## Expanding parity to a new assay

1. Mature the science in `lisca-*-assay` (CLI + real data), including a Rust
   crate when ready to import.
2. Depend on that crate via git URL (no cycle back to this repo). Keep crop
   here until it is truly shared infrastructure.
3. Register in `assays.rs` + contracts enum when ready for Studio.
4. Add or extend a **parity binary** with stage subcommands matching the
   Python CLI names (thin dispatch is enough).
5. Run synthetic + one real workspace differential before enabling in
   `ENABLED_STUDIO_ASSAY_IDS`.

## Related docs

- Studio analysis layout and chart packages: [`analysis.md`](./analysis.md)
- Product assay non-goals / closed enum: [`PRODUCT.md`](../../PRODUCT.md)
- Domain language: [`CONTEXT.md`](../../CONTEXT.md)
- Agent skill: [`.agents/skills/lisca-parity/SKILL.md`](../../.agents/skills/lisca-parity/SKILL.md)
- Sidecar parity: [lisca-transfection-assay `docs/parity.md`](https://github.com/keejkrej/lisca-transfection-assay/blob/main/docs/parity.md)

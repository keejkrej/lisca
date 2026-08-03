# Assay parity: Python goal sources → Rust production

## Why this exists

Most **analysis science** is developed outside this monorepo, in focused Python
packages:

| Sibling package (R&D) | Role |
| --- | --- |
| [`lisca-transfection-assay`](../../../lisca-transfection-assay) | Transfection / transfection pipeline (segment → timeseries → AUC → fit + plots) |
| `lisca-killing-assay` (planned / external goals via mupattern) | Immune-killing survival / kill-curve science |
| `lisca-binding-assay` (planned) | Binding / LNP-style assays before Studio registration |

When a package is **mature** (stable CLI, stable workspace layout, trusted on
real experiments), its *goals* are rewritten into **Rust** under
`crates/lisca/src/analysis/` so Studio and desktop builds ship one native
pipeline. Python remains the place to prototype and to **oracle** numerical
results.

This doc is the process and contract for that rewrite. Day-to-day Studio chart
wiring stays in [`analysis.md`](./analysis.md). Agent workflow:
[`/lisca-parity`](../../.agents/skills/lisca-parity/SKILL.md).

## Roles

| Layer | Responsibility |
| --- | --- |
| **Goal source** (Python `lisca-*-assay`) | Define stages, flags, output paths, CSV columns, plot names, scientific definitions |
| **Prod port** (Rust `crates/lisca`) | Idiomatic, fast implementation Studio runs; same contracts and answers |
| **Parity cage** (tests + CLI) | Prove the two stay aligned as either side evolves |
| **Studio UI** (`@lisca/analysis`, Studio web) | Consume Rust outputs; chart catalogs must match file/column contracts |

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
 port goals → crates/lisca assays/<name>/  (idiomatic Rust)
        │
        ▼
 parity CLI + differential loops + synthetic tests
        │
        ▼
 Studio / contracts only after stages green
```

1. **Develop in Python** until stage semantics and I/O are trusted.
2. **Port to Rust** stage-by-stage (or full pipeline when small).
3. **Prove parity** with synthetic fixtures and at least one real workspace
   (e.g. `~/data/TF84` for transfection).
4. **Wire Studio** only after contract + scientific parity hold.
5. **Keep Python** as the oracle: ignored tests and manual `lisca-analyze` vs
   `uv run …` diffs when kernels change.

## Assay map

| Studio `assayId` | Goal source | Rust module | Parity CLI | Notes |
| --- | --- | --- | --- | --- |
| `transfection` (Studio wire id; science = transfection) | `../lisca-transfection-assay` (`transfection` CLI) | `analysis/assays/gene_expression/` | `lisca-analyze` | Reference port; TF84 used as real-workspace check |
| `immune-killing` | mupattern / future `lisca-killing-assay` | `analysis/assays/immune_killing/` | extend when stages need stage-CLI | ONNX ResNet + kill-curve tables |
| `lnp-binding` / binding | future `lisca-binding-assay` | none until mature | — | Closed enum: do not half-register |

Adding a Studio assay id is a **cross-cutting** change (`@lisca/contracts`,
Rust, generated types). Unsupported ids fail explicitly — see `PRODUCT.md`.

## What “parity” means

### Contract parity

- Workspace layout: `assay.json`, `roi/PosN/`, `mask/PosN/`,
  `timeseries/`, `results/` (no `slide.json`).
- Output basenames Studio and Python both expect (`auc.csv`, `fit.csv`,
  `traces.png`, …).
- CSV column names and row identity keys.
- Stage order for full pipelines (`transfection pipeline` / `lisca-analyze pipeline`).
- Flag defaults that change science (`--interval`, `--max-onset-minutes`,
  segmentation radius/sigma, jobs only for performance).

### Scientific parity

Same definitions, within tolerances:

| Quantity | Typical relative tolerance | Where locked |
| --- | --- | --- |
| Masked intensity / background / corrected | `1e-6` | unit + timeseries tests |
| Trapezoidal AUC | `1e-6` | unit + AUC stage |
| Kinetic fit params (Rust reference kernel) | `1e-5` | synthetic fit test |
| Kinetic fit vs Python CLI (real/synthetic e2e) | `2e-2` (aim much tighter after kernel bugs fixed) | ignored CLI test + real workspace |

Use relative error `|a−b| / max(|a|,|b|,ε)`. Report p50/p90/p99/max and
success-flag mismatches before changing code.

### Explicit non-goals

- Identical floating evaluation order or BLAS/LAPACK identity.
- Matching Python packaging, Typer apps, or process-pool shape.
- PNG pixel-identical plots (layout constants should match; visual QA is
  secondary to CSV science).

## Parity CLI

Rust stages must stay invocable **without** the Studio HTTP server so agents
and humans can run differential loops.

### Transfection: `lisca-analyze`

```sh
cargo build -p lisca --release --bin lisca-analyze
./target/release/lisca-analyze --help
```

Stage names mirror `transfection`:

| Command | Writes |
| --- | --- |
| `segment` | `mask/PosN/*.tif` |
| `timeseries` | `timeseries/sc*_ch*.csv` (+ xlsx) |
| `auc` | `results/auc.csv` |
| `fit` | `results/fit.csv` |
| `plot-timeseries` / `plot-auc` / `plot-fit` | `results/*.png` |
| `pipeline` (`analyze`, `all`) | full Studio order from `assay.json` |

Common flags: `--assay` (default `<workspace>/assay.json`), `--interval`,
`--jobs`, `--max-onset-minutes`, segment `--force` / radius / sigma.

Details and examples: [`analysis.md`](./analysis.md) § Parity CLI.

### Side-by-side recipe

```sh
WS=~/data/TF84
INTERVAL=10

# 1) golden
uv run --directory ../lisca-transfection-assay \
  transfection auc "$WS"
mkdir -p /tmp/TF84-python-golden
cp "$WS/results/auc.csv" /tmp/TF84-python-golden/

# 2) candidate
./target/release/lisca-analyze auc "$WS" --interval "$INTERVAL"

# 3) compare (keys + relative tolerance)
# join on slide_channel,pos,roi — see skill reference workflow
```

Backup entire `results/` + `timeseries/` before a full re-run.

## Tests in this repo

| Lane | Command | Purpose |
| --- | --- | --- |
| Always-on synthetic | `cargo test -p lisca --test gene_expression_parity` | Tiny workspace; reference formulas |
| Optional Python e2e | `cargo test -p lisca --test gene_expression_parity -- --ignored` | Needs `../lisca-transfection-assay` (or `../transfection`) + `uv` |
| Library units | `cargo test -p lisca --lib` | Kernels in `array.rs`, slide mapping, … |

Support kernels for tests: `crates/lisca/tests/support/transfection_reference.rs`
(goal formulas, not a second production path).

## Design stance for ports

Rust should be **idiomatic for this crate**:

- Shared ROI math in `analysis/array.rs` (`ndarray`, `ndarray-stats`).
- Segmentation via `ndarray-ndimage` + `imageproc` (Otsu).
- Plots via mplot-rs; kill models via ONNX (`ort`).
- Per-assay code under `analysis/assays/<name>/`.
- Progress + HTTP remain in Studio; parity CLI calls the same stage functions.

Sibling repos describe **goals**. They are not a licence to transliterate
Python line-by-line.

## Expanding parity to a new assay

1. Mature the science in `lisca-*-assay` (CLI + real data).
2. Add Rust `assays/<name>/` and register in `assays.rs` + contracts enum when
   ready for Studio.
3. Add or extend a **parity binary** with stage subcommands matching the
   Python CLI names.
4. Add `crates/lisca/tests/<name>_parity.rs` + tolerances in this doc.
5. Run synthetic + one real workspace differential before enabling in
   `ENABLED_STUDIO_ASSAY_IDS`.

## Related docs

- Studio analysis layout and chart packages: [`analysis.md`](./analysis.md)
- Product assay non-goals / closed enum: [`PRODUCT.md`](../../PRODUCT.md)
- Domain language: [`CONTEXT.md`](../../CONTEXT.md)
- Agent skill: [`.agents/skills/lisca-parity/SKILL.md`](../../.agents/skills/lisca-parity/SKILL.md)

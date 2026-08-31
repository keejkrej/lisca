---
name: lisca-parity
description: >
  Ensure scientific and contract parity between mature Python assay packages
  (lisca-*-assay) and their Rust rewrites in this monorepo. Use when the user
  mentions parity, rust-parity, Python vs Rust analysis, lisca-analyze,
  transfection/killing/binding assay ports, rewriting a lisca-* assay into
  crates/lisca, comparing stage CSVs, or runs /lisca-parity.
---

# LiSCA assay parity

**Python is the lab notebook.** Mature transfection analysis (Python + Rust)
lives in [`lisca-transfection-assay`](https://github.com/keejkrej/lisca-transfection-assay);
this monorepo **imports** that crate and package via git URL. Killing remains
in-tree until its sidecar exists. Parity means **same workspace contracts and
same scientific answers**, not the same NumPy loops.

Read the full process and assay map in
[`docs/analysis/parity.md`](../../../docs/analysis/parity.md) before changing
kernels. Transfection Python↔Rust comparisons belong in the sidecar
(`docs/parity.md` there). Stage CLI details live in
[`docs/analysis/analysis.md`](../../../docs/analysis/analysis.md).

## Leading words

- **Goal source** — the Python package defines _what_ to compute and _which
  files_ to read/write (columns, stage order, plot names).
- **Prod port** — Imported sidecar crate (transfection) or in-tree Rust (killing).
- **Contract parity** — paths, CSV headers, plot filenames, `assay.json` /
  `slide.json` semantics.
- **Scientific parity** — same definitions within documented tolerances
  (not bitwise identity).
- **Differential loop** — same workspace + same stage args on Python and Rust;
  compare golden CSVs.

## When this skill applies

| Situation                                             | Do                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| Porting a mature stage from a `lisca-*-assay` package | Follow phases below end-to-end                                    |
| "TF84 / real workspace doesn't match Python"          | Differential loop → fix kernel → re-diff                          |
| Adding a new Studio assay id                          | Map goal source → register pipeline → parity cage before shipping |
| Only chart UI / Studio wiring                         | Prefer `docs/analysis/analysis.md`; no Python CLI needed          |

## Phase 1 — Map the goal source

1. Identify the assay id (`gene-expression`, `immune-killing`, …) and sibling
   package (`../lisca-transfection-assay`, future `../lisca-killing-assay`, …).
2. Inventory **stages**, **CLI flags**, **output paths**, and **CSV columns**
   from the Python package (commands + README / `*-analyze.sh`), not from
   Rust first.
3. Locate the Rust counterpart: transfection is the git crate
   `lisca-transfection` (thin dispatch under
   `crates/lisca/src/analysis/assays/transfection/`); killing is still
   `assays/killing/`. Parity CLI: `lisca-analyze` for transfection.

**Done when:** you can name goal-source path, stage list, and Rust module paths
in one short table.

## Phase 2 — Build a differential loop

Prefer this order:

1. **Stage CLI side-by-side** on one workspace (fastest for real data):

   ```sh
   # golden
   uv run --directory ../lisca-transfection-assay transfection <stage> WORKSPACE …
   cp WORKSPACE/results/<artifact>.csv /tmp/<artifact>-python.csv

   # candidate
   cargo build -p lisca --release --bin lisca-analyze
   ./target/release/lisca-analyze <stage> WORKSPACE …
   # compare keys + numeric tolerances
   ```

2. **Synthetic fixture** in `crates/lisca/tests/*_parity.rs` +
   `tests/support/*_reference.rs` (tiny ROI, few timepoints) — always-on unit
   cage.

3. **Ignored e2e** that shells out to `uv run …` when the sibling checkout
   exists (`cargo test -p lisca -- --ignored`).

4. **Full pipeline** only after stages match
   (`lisca-analyze pipeline` vs Python analyze script).

Backup goldens before overwriting a real workspace
(`/tmp/<dataset>-python-golden/`).

**Done when:** you have run one command that fails on a known mismatch and
passes on a known-good stage (paste invocation + verdict).

## Phase 3 — Port or fix (Rust is idiomatic)

- Implement goals in the **sidecar crate** (transfection) or idiomatic
  ONNX / mplot-rs in this repo (killing, crop).
  **Do not** copy the transfection pipeline back into `crates/lisca`.
  **Do not** add new assay-specific weights under `models/` (product models
  only: Smart exclude / Smart segment). Transfection ONNX may stay as a Studio
  adapter until the sidecar un-stubs it; resolve HF
  `keejkrej/single-cell-pattern-unet` via `LISCA_PATTERN_SEG_MODEL`.
- Match **stage order**, **defaults** (e.g. variation radius, Gaussian sigma,
  fit grid sizes), and **edge semantics** (inclusive position ranges, onset
  cap).
- Export stages through a parity CLI with **the same command names and flag
  shapes** as Python when practical (`segment`, `timeseries`, `auc`, `fit`, …).
- Shared kernels that crop or killing still need stay in this repo
  (`roi_stack`, `csv_io`, `array.rs`). Transfection kernels live in the sidecar.

Common failure class: **grid refine windows**, median pooling order, mask
foreground definition, time = `t * interval` units. Diff distributions by
column before rewriting large blocks.

**Done when:** differential loop is green on the stage under change within the
tolerances in `docs/analysis/parity.md`.

## Phase 4 — Lock the cage

1. Unit / integration tests for the stage (synthetic).
2. Optional ignored Python CLI test for e2e.
3. Update `docs/analysis/parity.md` assay map and tolerances if the contract
   changed.
4. If Studio charts depend on new columns/plot ids, update `@lisca/analysis`
   catalog too — contract parity includes UI expectations.

**Done when:** `cargo test -p lisca` is green; real-workspace differential
documented or re-run; docs list the stage.

## What not to do

- Do not treat Python as a line-by-line implementation reference.
- Do not require bitwise float identity; use the documented relative
  tolerances (and tighten only with evidence).
- Do not invent a new assay id in Rust without contracts + Studio registration
  (closed enum — see `PRODUCT.md`).
- Do not skip the differential loop and "eyeball" plots as the only check.

## Quick map (see docs for full table)

| Assay id         | Goal source (sibling)                       | Rust                                                         | Parity CLI            |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------ | --------------------- |
| `transfection`   | `lisca-transfection-assay` (`transfection`) | git crate `lisca-transfection` + thin `assays/transfection/` | `lisca-analyze`       |
| `killing`        | killing assay / mupattern goals             | `assays/killing/`                                            | (extend when porting) |
| binding (future) | `../lisca-binding-assay`                    | (not registered until mature)                                | —                     |

## Completion checklist

- [ ] Goal source stages and outputs inventoried
- [ ] Differential loop run (synthetic and/or real workspace)
- [ ] Rust stages match within tolerances
- [ ] Tests + docs updated
- [ ] Studio contract (CSV/plot ids) still holds if UI-facing

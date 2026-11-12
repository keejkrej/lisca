# ADR-0024: Death-reporter viability calls PI steps without the brightfield classifier

- **Status:** accepted
- **Date:** 2026-11-12

## Decision

We will call per-ROI `t_death` and sample-level `% viable` survival curves directly from death-reporter fluorescence step transitions in [`lisca-killing-assay`](https://github.com/keejkrej/lisca-killing-assay) (dispatched from `crates/lisca/src/analysis/assays/killing/death_reporter.rs`), because death-reporter (`killing-death-reporter`) assays already measure propidium iodide (PI) uptake directly and must not block on the external brightfield `killing-assay-resnet18` classifier.

## Why

Prior to this change, `killing-death-reporter` wrote per-frame fluorescence traces (`analysis/Pos{n}/fluorescence.csv`) and summary overlays, while `results/death_times.csv` and `results/kill_curve.csv` were only produced by the Python/ONNX brightfield classifier workflow in `lisca-killing-assay`. That left Studio's `killing-death-reporter` pipeline without per-cell death times or survival curves (`% viable` vs time).

Instead of coupling death-reporter analysis to external classifier weights, `viability.rs` calibrates noise across all workspace ROI fluorescence traces (`p95 - p10` amplitude span and median absolute frame-to-frame step MAD) and fits an optimal two-regime upward step model (`t_death`, sustained post-step rise above baseline). This writes `analysis/Pos{n}/viability.csv`, `results/<sample>/viability.xlsx`, `results/death_times.csv`, `results/kill_curve.csv`, and single-axes multi-sample `results/survival_curve.png` (`viable cells (%)` vs `time (min)`). Brightfield classifier prediction (`killing-predict` / `killing-clean`) remains owned by `lisca-killing-assay`.

## Looks like a bug when

- `killing-death-reporter` produces `results/death_times.csv`, `results/kill_curve.csv`, and `results/survival_curve.png` without downloading `killing-assay-resnet18` weights.
- Zero-death negative control positions produce `results/death_times.csv` with `death_time = -1` and `dead = 0` while `plot_death_times` exits cleanly without writing an empty histogram.

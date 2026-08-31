# Parity workflow cheatsheet

Pointer target for agents; the canonical long form is
`docs/analysis/parity.md` in the monorepo. Transfection Python↔Rust parity
is owned by [`lisca-transfection-assay`](https://github.com/keejkrej/lisca-transfection-assay)
(`docs/parity.md` there). This repo imports that crate.

## Transfection (imported crate)

| Stage      | Python                                      | Rust (`lisca-analyze` → git crate)                                     |
| ---------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| segment    | `transfection segment WS`                   | `lisca-analyze segment WS` (Otsu via crate; `--backend onnx` is local) |
| timeseries | `transfection timeseries WS`                | `lisca-analyze timeseries WS`                                          |
| auc        | `transfection auc WS --interval N`          | `lisca-analyze auc WS --interval N`                                    |
| fit        | `transfection fit WS --interval N`          | `lisca-analyze fit WS --interval N`                                    |
| plots      | `plot-timeseries` / `plot-auc` / `plot-fit` | same names on `lisca-analyze`                                          |
| full       | `transfection pipeline WS`                  | `lisca-analyze pipeline WS`                                            |

Build:

```sh
cargo build -p lisca --release --bin lisca-analyze
```

Tests:

```sh
# wrapper still writes sidecar CSVs
cargo test -p lisca --test transfection_parity
cargo test -p lisca --test transfection_parity -- --ignored

# canonical Python vs Rust cage (sidecar checkout)
cargo test -p lisca-transfection   # in ../lisca-transfection-assay
```

## Diff recipe (CSV)

1. Run Python stage → copy artifact to `/tmp/*-python.csv`.
2. Run Rust stage (overwrites workspace).
3. Join on identity keys (`roi` / `pos,roi,t`; XLSX packs prefix `slide_channel,sample,pos`).
4. Relative error: `|a-b| / max(|a|,|b|,ε)` with stage ε from
   the sidecar `docs/parity.md` / `docs/analysis/parity.md`.
5. Report p50/p90/p99/max and success-flag mismatches before editing kernels.
6. Kernel fixes for transfection go in `lisca-transfection-assay`, not a fork
   under `crates/lisca`.

## Bug classes that have bitten

- Fit refine window not `[i-1, i+1]` clamped (asymmetric refine vs Python).
- Wrong time unit (`t` vs `t * interval` minutes).
- Exclusive vs inclusive position ranges in `assay.json`.
- Background = mask-complement mean vs quartile hacks (use segment masks).
- Pooled protein degradation median over failed fits.

## Expanding the CLI

New assay stages should grow **parity subcommands** on a dedicated bin (or
extend `lisca-analyze` with assay-qualified names) so agents never need the
Studio HTTP server to run a differential loop.

# Parity workflow cheatsheet

Pointer target for agents; the canonical long form is
`docs/analysis/parity.md` in the monorepo.

## Gene-expression (current reference implementation)

| Stage      | Python                                           | Rust                                |
| ---------- | ------------------------------------------------ | ----------------------------------- |
| segment    | `transfection segment WS --sample slide.json`    | `lisca-analyze segment WS`          |
| timeseries | `transfection timeseries WS --sample slide.json` | `lisca-analyze timeseries WS`       |
| auc        | `transfection auc WS --interval N`               | `lisca-analyze auc WS --interval N` |
| fit        | `transfection fit WS --interval N`               | `lisca-analyze fit WS --interval N` |
| plots      | `plot-timeseries` / `plot-auc` / `plot-fit`      | same names on `lisca-analyze`       |
| full       | `transfection-analyze.sh`                        | `lisca-analyze pipeline WS`         |

Build:

```sh
cargo build -p lisca --release --bin lisca-analyze
```

Tests:

```sh
cargo test -p lisca --test gene_expression_parity
cargo test -p lisca --test gene_expression_parity -- --ignored
```

## Diff recipe (CSV)

1. Run Python stage → copy artifact to `/tmp/*-python.csv`.
2. Run Rust stage (overwrites workspace).
3. Join on identity keys (`slide_channel,pos,roi` or `pos,roi,t`).
4. Relative error: `|a-b| / max(|a|,|b|,ε)` with stage ε from
   `docs/analysis/parity.md`.
5. Report p50/p90/p99/max and success-flag mismatches before editing kernels.

## Bug classes that have bitten

- Fit refine window not `[i-1, i+1]` clamped (asymmetric refine vs Python).
- Wrong time unit (`t` vs `t * interval` minutes).
- Exclusive vs inclusive position ranges in `assay.json`.
- Background = mask-complement mean vs quartile hacks (use segment masks).
- Pooled protein decay median over failed fits.

## Expanding the CLI

New assay stages should grow **parity subcommands** on a dedicated bin (or
extend `lisca-analyze` with assay-qualified names) so agents never need the
Studio HTTP server to run a differential loop.

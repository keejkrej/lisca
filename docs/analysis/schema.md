# Workspace table schema

Canonical on-disk columns for a LISCA workspace. Kinetic ids match
[`CONTEXT.md`](../../CONTEXT.md) (`onset_time`, `expression_rate`,
`mrna_lifetime`, `protein_lifetime`, `baseline_intensity`, `auc`). Times and
lifetimes are **minutes**. Lifetimes are half-lives ln(2)/δ and ln(2)/β.

Writers use the names below.

## `bbox/Pos{n}.csv` (lisca crop/align)

`roi`, `x`, `y`, `w`, `h` — integers, top-left origin, `w`/`h` > 0.

Old `crop` headers are rewritten to `roi` in place when a tool opens the
workspace, then `roi` is required. `crop` is not a live alias.

## `analysis/Pos{n}/` (CSV only; written by transfection sidecar)

Pos is the folder name.

| File        | Columns                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `ch{c}.csv` | `roi`, `t`, `area`, `background`, `sum`, `corrected`                                                         |
| `auc.csv`   | `roi`, `auc`                                                                                                 |
| `fit.csv`   | `roi`, `baseline_intensity`, `onset_time`, `expression_rate`, `mrna_lifetime`, `protein_lifetime`, `success` |

`channel` on `auc.csv` / `fit.csv` only if that Pos has more than one signal
channel.

## `results/<sample>/` (XLSX + PNG only)

No `slide_channel`, no `sample` column, no CSV under `results/`. The folder is
the sample.

| File          | Columns                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `traces.xlsx` | `pos`, `roi`, `t`, `area`, `background`, `sum`, `corrected`                                                         |
| `auc.xlsx`    | `pos`, `roi`, `auc`                                                                                                 |
| `fit.xlsx`    | `pos`, `roi`, `baseline_intensity`, `onset_time`, `expression_rate`, `mrna_lifetime`, `protein_lifetime`, `success` |

`channel` only if that sample has more than one signal channel.

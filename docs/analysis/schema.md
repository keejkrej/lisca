# Workspace on-disk schema

This repo (`keejkrej/lisca`) owns workspace **folder names**, the **bbox / ROI**
on-disk formats, and the locked analysis/results **table column names**. Assay
sidecars import the folder names and bbox/ROI readers; they do not redefine them.

| Language                    | Import                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python (`lisca`, no extras) | `lisca.core.paths` (folder names + path builders), `lisca.core.bbox.parse_bbox_csv`, `lisca.core.workspace.load_bbox_rows` / `load_position_index`             |
| Rust                        | `lisca-workspace` crate (git-depend on this repo, package `lisca-workspace`). Do **not** depend on crate `lisca` from `lisca-transfection` — that would cycle. |

A follow-up in the transfection sidecar switches that package onto these imports.

Kinetic ids (glossary terms in [`CONTEXT.md`](../../CONTEXT.md)): `onset_time`,
`expression_rate`, `mrna_lifetime`, `protein_lifetime`, `baseline_intensity`,
`auc`. Times and lifetimes are **minutes**. Lifetimes are half-lives ln(2)/δ
and ln(2)/β. Writers use the names below.

## Folder tree

```
<workspace>/
  assay.json
  bbox/Pos{n}.csv
  align/Pos{n}.json
  roi/Pos{n}/index.json
  roi/Pos{n}/Roi{k}.tif
  mask/Pos{n}/
  analysis/Pos{n}/
  traces/Pos{n}/        # killing only
  results/
```

Constants: `bbox/`, `roi/`, `align/`, `mask/`, `analysis/`, `results/`, `assay.json`.

## `bbox/Pos{n}.csv` (lisca crop/align)

Live header is exactly **`roi, x, y, w, h`** (integers, top-left origin,
`w`/`h` > 0; column names, order may vary).

The bbox CSV is an **export artifact**. Grid `i,j` lives in
`align/Pos{n}.json` (`excludedPatterns` / grid state), not in this file.
Older align files named these `excludedCells` and `grid.cellWidth` /
`grid.cellHeight`; `migrate_workspace` rewrites them to `excludedPatterns` and
`grid.patternWidth` / `grid.patternHeight` on open (a file with both names is an
error).

- Parser: `lisca.core.bbox.parse_bbox_csv` (Python) /
  `lisca_workspace::parse_bbox_csv` (Rust). Crop and `load_bbox_rows` call this
  after `migrate_workspace`.
- Old `crop` headers are rewritten to `roi` in place when a tool opens the
  workspace (`migrate_workspace`, migration `bbox_crop_to_roi`), then `roi` is
  required. `crop` is not a live alias.
- Extra columns (legacy `i,j` leftover on old files) are ignored by the parser.
  Writers emit only the five live columns.
- Duplicate `roi` values are rejected.

## `assay.json` Samples and channels

Contract source: `packages/contracts/src/assay.schema.ts`. A Sample is
identified by its name.

| Key                         | Shape                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- |
| `samples[]`                 | `{ name, positions }`; `name` non-empty after trim and unique (trimmed) per assay |
| `analysis.channels`         | `{ segmentation, signal[] }` — default Segmentation channel and Signal channels   |
| `analysis.sampleChannels[]` | `{ sample, segmentation, signal[] }` — override for the Sample named `sample`     |

There is no `slideChannel` and no `mask` channel key. Older files are rewritten
by `migrate_workspace` (migration `assay_samples_by_name`) before parsing:

- `samples[].slideChannel` is dropped; a blank name becomes
  `Sample {slideChannel}`.
- `analysis.sampleChannels[].slideChannel` becomes `sample`, set to the name of
  the `samples[]` row that had that `slideChannel`.
- `mask` becomes `segmentation` in `analysis.channels` and in each
  `sampleChannels` row, keeping the key's position.
- The migration fails (and leaves the file untouched) on duplicate names after
  blank-fill, a `sampleChannels` row whose `slideChannel` matches no Sample, or a
  key present in both forms (`mask` + `segmentation`, `slideChannel` + `sample`).
- The file is written atomically as 2-space-indented JSON with a trailing
  newline. Other keys and key order are kept.

## `roi/`

Cropped stacks live under `roi/Pos{n}/`:

- `Roi{k}.tif` — TCZYX TIFF stack for one ROI
- `index.json` — slim position index

`index.json` fields: `position`, `axisOrder` (always `TCZYX`), `timeCount`,
`channelCount`, `zCount`, optional `timeIndices`, `rois[]` with `roi`,
`fileName`, `bbox` (`roi, x, y, w, h`). Stack shape is **derived** as
`[timeCount, channelCount, zCount, bbox.h, bbox.w]` — not stored per ROI.

Python readers: `lisca.core.workspace.load_position_index` (other packages should
import this instead of re-parsing). Path helper: `roi/Pos{n}/index.json`.

## `analysis/Pos{n}/` (CSV only; written by transfection sidecar)

Pos is the folder name. Folder name `analysis/` is owned here; the sidecar
writes these tables.

| File        | Columns                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `ch{c}.csv` | `roi`, `t`, `area`, `background`, `sum`, `corrected`                                                         |
| `auc.csv`   | `roi`, `auc`                                                                                                 |
| `fit.csv`   | `roi`, `baseline_intensity`, `onset_time`, `expression_rate`, `mrna_lifetime`, `protein_lifetime`, `success` |

`channel` on `auc.csv` / `fit.csv` only if that Pos has more than one signal
channel.

## `results/<sample>/` (XLSX + PNG only)

No `sample` column, no CSV under `results/`. The folder is the Sample: its
filesystem-safe name, prefixed with the 0-based assay index (`{index}_{safe}`)
only when two Sample names sanitize to the same folder. Folder name `results/`
is owned here; transfection packs are written by the sidecar. Killing still
writes `results/` tables in this repo until its sidecar exists — see
[Killing `traces/` and `results/`](#killing-traces-and-results-in-tree-until-the-killing-sidecar-exists).

| File          | Columns                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `traces.xlsx` | `pos`, `roi`, `t`, `area`, `background`, `sum`, `corrected`                                                         |
| `auc.xlsx`    | `pos`, `roi`, `auc`                                                                                                 |
| `fit.xlsx`    | `pos`, `roi`, `baseline_intensity`, `onset_time`, `expression_rate`, `mrna_lifetime`, `protein_lifetime`, `success` |

`channel` only if that sample has more than one signal channel.

## Killing `traces/` and `results/` (in-tree until the killing sidecar exists)

| File                              | Columns                                         |
| --------------------------------- | ----------------------------------------------- |
| `traces/Pos{n}/ch{m}.csv`         | `roi`, `t`, `p_dead`                            |
| `results/predictions.csv`         | `t`, `crop`, `p_dead`, `label`, `pos`, `sample` |
| `results/predictions_cleaned.csv` | `t`, `crop`, `label`, `pos`, `sample`           |
| `results/death_times.csv`         | `crop`, `death_time`, `pos`, `sample`           |
| `results/kill_curve.csv`          | `t`, `n_alive`, `sample`                        |

`sample` is the Sample name. Older killing Workspaces wrote `timeseries/Pos{n}/`;
`migrate_workspace` (migration `killing_traces_dir`) renames `timeseries/` to
`traces/` when `traces/` is absent. When both exist, an empty `timeseries/` or
one with the same files and bytes as `traces/` is removed; otherwise the
migration fails and the user merges them by hand.

## Migration order

`migrate_workspace` runs `bbox_crop_to_roi`, `assay_samples_by_name`, then
`killing_traces_dir`. Each is idempotent and a no-op when its input is absent.

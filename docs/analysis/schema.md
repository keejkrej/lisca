# Workspace on-disk schema

This repo (`keejkrej/lisca`) owns workspace **folder names**, the **bbox / ROI**
on-disk formats, and the locked analysis/results **table column names**. Assay
sidecars import the folder names and bbox/ROI readers; they do not redefine them.

| Language                    | Import                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python (`lisca`, no extras) | `lisca.core.paths` (folder names + path builders), `lisca.core.bbox.parse_bbox_csv`, `lisca.core.workspace.load_bbox_rows` / `load_position_index`             |
| Rust                        | `lisca-workspace` crate (git-depend on this repo, package `lisca-workspace`). Do **not** depend on crate `lisca` from `lisca-transfection` — that would cycle. |

A follow-up in the transfection sidecar switches that package onto these imports.

Kinetic ids match [`CONTEXT.md`](../../CONTEXT.md) (`onset_time`,
`expression_rate`, `mrna_lifetime`, `protein_lifetime`, `baseline_intensity`,
`auc`). Times and lifetimes are **minutes**. Lifetimes are half-lives ln(2)/δ
and ln(2)/β. Writers use the names below.

## Folder tree

```
<workspace>/
  assay.json
  bbox/Pos{n}.csv
  align/Pos{n}.json
  align/occupancy-pack.json    # assay-scoped few-shot occupancy; see occupancy-prompt-pack.md
  roi/Pos{n}/index.json
  roi/Pos{n}/Roi{k}.tif
  mask/Pos{n}/
  analysis/Pos{n}/
  results/
  annotations/labels.json
  annotations/roi/Pos{n}/Roi{k}/
  timeseries/Pos{n}/          # killing in-tree tables until a sidecar exists
  sidecar/                    # reserved for workstation / future killing sidecar
```

Constants: `bbox/`, `roi/`, `align/`, `mask/`, `analysis/`, `results/`,
`annotations/`, `timeseries/`, `sidecar/`, `assay.json`. Occupancy support
examples persist at `align/occupancy-pack.json` (workspace-level, not per
Pos).

## `bbox/Pos{n}.csv` (lisca crop/align)

Live header is exactly **`roi, x, y, w, h`** (integers, top-left origin,
`w`/`h` > 0; column names, order may vary).

The bbox CSV is an **export artifact**. Grid `i,j` lives in
`align/Pos{n}.json` (`excludedCells` / grid state), not in this file.

- Parser: `lisca.core.bbox.parse_bbox_csv` (Python) /
  `lisca_workspace::parse_bbox_csv` (Rust). Crop and `load_bbox_rows` call this
  after `migrate_workspace`.
- Old `crop` headers are rewritten to `roi` in place when a tool opens the
  workspace (`migrate_workspace`), then `roi` is required. `crop` is not a live
  alias.
- Extra columns (legacy `i,j` leftover on old files) are ignored by the parser.
  Writers emit only the five live columns.
- Duplicate `roi` values are rejected.

## `roi/`

Cropped stacks live under `roi/Pos{n}/`:

- `Roi{k}.tif` — TCZYX TIFF stack for one ROI
- `index.json` — slim position index

`index.json` fields: `position`, `axisOrder` (always `TCZYX`), `timeCount`,
`channelCount`, `zCount`, optional `timeIndices`, optional `channelIndices`,
optional `channelLabels`, `rois[]` with `roi`, `fileName`, `bbox`
(`roi, x, y, w, h`). Stack shape is **derived** as
`[timeCount, channelCount, zCount, bbox.h, bbox.w]` — not stored per ROI.

`timeIndices` / `channelIndices` are the source acquisition indices for each
T / C plane (length equals `timeCount` / `channelCount`). Crop writes every
selected source channel; when omitted, consumers default to `0..count-1`.
`channelLabels` holds source names when the reader has them (folder `BF` /
`GFP`; ND2 when metadata exposes names). Numeric-only ND2/CZI labels are
omitted.

TIFF pages are grayscale, one page per TCZYX plane. There is no OME or ImageJ
hyperstack tag; consumers should use `index.json`, not embedded TIFF metadata.

Python readers: `lisca.core.workspace.load_position_index` (other packages should
import this instead of re-parsing). Path helper: `roi/Pos{n}/index.json`.

## `annotations/`

Open label catalog plus per-frame classification / mask files:

- `annotations/labels.json` — `{ labels: [{ id, name, color }, ...] }` (not a
  closed alive/dead enum)
- `annotations/roi/Pos{n}/Roi{k}/C{c}_T{t}_Z{z}.{json,png}` — one frame

Killing workspaces may use ids `alive`, `dead`, `tumor`, `tcell` (see
`KILLING_ANNOTATION_LABELS`). Studio killing analysis does not read these
labels.

## `timeseries/` (killing, in-tree)

Until `lisca-killing-assay` exists, killing writes `timeseries/Pos{n}/ch{c}.csv`
(`roi,t,p_dead`) from the ResNet presence classifier. Import the folder name
from `lisca.core.paths.TIMESERIES_DIR` / `lisca_workspace::TIMESERIES_DIR`.

## `sidecar/` (reserved)

lisca does not write this folder. A workstation or future killing sidecar
should use these stable names under `sidecar/`:

| File              | Intended contents                                         |
| ----------------- | --------------------------------------------------------- |
| `events.json`     | Death / engagement event table per ROI                    |
| `traces.parquet`  | Per-ROI time traces (`health_tumor`, `health_T`, contact) |
| `tracks.csv`      | T-cell tracks inside an ROI                               |
| `engagements.csv` | Contact episodes (`t_engage_on` / `t_engage_off`)         |

Path helpers: `sidecar_dir` / `sidecar_path`. Do not invent a second results
tree for those artifacts.

Killing `assay.json` may also set optional `analysis.channelRoles`
(`brightfield`, `effector`, `deathMarker`) so extra fluorescence planes stay
named without joining `analysis.channels.signal` (the in-tree classifier still
reads `signal` only).

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

No `slide_channel`, no `sample` column, no CSV under `results/`. The folder is
the sample. Folder name `results/` is owned here; transfection packs are written
by the sidecar. Killing still writes `results/` tables in this repo until its
sidecar exists — see [`analysis.md`](./analysis.md).

| File          | Columns                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `traces.xlsx` | `pos`, `roi`, `t`, `area`, `background`, `sum`, `corrected`                                                         |
| `auc.xlsx`    | `pos`, `roi`, `auc`                                                                                                 |
| `fit.xlsx`    | `pos`, `roi`, `baseline_intensity`, `onset_time`, `expression_rate`, `mrna_lifetime`, `protein_lifetime`, `success` |

`channel` only if that sample has more than one signal channel.

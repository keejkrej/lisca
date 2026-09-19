# Killing workspace recipe

Use Studio (or CLI crop) to turn a multiposition killing / coculture recording
into a ROI workspace. Novel segment / track / event models belong in a later
assay sidecar — this repo stops at clean stacks, labels, and export paths.

For on-disk field names see [`schema.md`](./schema.md). For the in-tree ResNet
kill curve see [`analysis.md`](./analysis.md).

## What you need

- Source: ND2, CZI, or a folder series (`Pos{p}/img_channel{c}_position{p}_time{t}_z{z}`).
- Channels: brightfield, plus optional T-cell fluorescence and PI / TOTO-3.
  Crop writes **every** source channel into each `RoiK.tif`.
- A workspace folder Studio can write (`assay.json`, `bbox/`, `roi/`, …).

## Studio steps

1. **Create a killing assay.** Choose Killing. Set the source path, workspace
   folder, and frame interval (required; there is no killing default).
2. **Name extra fluorescence (optional).** On the first info step, set Effector
   (T-cell) and Death marker (PI / TOTO-3) if those planes exist. Mask and
   signal stay on the Samples step: mask is typically brightfield; signal is
   the plane the in-tree presence classifier reads.
3. **Samples.** One row per condition (`slideChannel`, name, position range,
   mask, signal). Extra roles do **not** go on `signal` — that would run the
   ResNet on T-cell / PI planes.
4. **Align.** Place the micropattern grid, exclude empty sites, save boxes
   (`bbox/PosN.csv` + `align/PosN.json`). Do not retrain Smart exclude per
   lab — bootstrap with Var exclude / manual edits; those corrections
   accumulate on `align/occupancy-pack.json` and remaining sites re-score
   after each edit once the pack is ready. See
   [`occupancy-prompt-pack.md`](./occupancy-prompt-pack.md).
5. **Crop.** Studio / `lisca-crop` writes `roi/PosN/RoiK.tif` (TCZYX pages) and
   `roi/PosN/index.json`.
6. **Annotate (optional).** Labels are an open list. A killing fixture seeds
   `alive`, `dead`, `tumor`, `tcell`. Add or rename freely; the in-tree kill
   pipeline does not consume annotator labels.
7. **Analyze (optional).** Studio killing analysis still scores binary presence
   → P(dead) → death times. Skip it if you only need ROI stacks for a
   workstation.

CLI crop (ND2/CZI from Python, any source from Rust):

```sh
# After align has written bbox/PosN.csv
lisca-crop --workspace /data/run --source /data/run.nd2
# or Studio crop from the aligned workspace
```

Folder sources crop in Studio / `lisca-crop` only. The Python `lisca crop`
command is ND2/CZI.

## Files a workstation should consume

| Path                          | Role                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `assay.json`                  | Assay type, interval, samples, `analysis.channels`, optional `analysis.channelRoles`                               |
| `bbox/PosN.csv`               | Site boxes `roi,x,y,w,h`                                                                                           |
| `roi/PosN/index.json`         | TCZYX counts, `timeIndices`, `channelIndices`, `channelLabels`, ROI bboxes                                         |
| `roi/PosN/RoiK.tif`           | One grayscale TIFF stack per ROI (all channels, all times)                                                         |
| `annotations/labels.json`     | Open classification catalog                                                                                        |
| `annotations/roi/PosN/RoiK/…` | Optional per-frame labels / masks                                                                                  |
| `sidecar/`                    | **Reserved.** lisca does not write this. Put `events.json`, `traces.parquet`, `tracks.csv`, `engagements.csv` here |

`index.json` example after a 3-channel crop:

```json
{
  "position": 1,
  "axisOrder": "TCZYX",
  "timeCount": 12,
  "channelCount": 3,
  "zCount": 1,
  "timeIndices": [0, 1, 2],
  "channelIndices": [0, 1, 2],
  "channelLabels": ["BF", "signal", "tcell"],
  "rois": [
    { "roi": 1, "fileName": "Roi1.tif", "bbox": { "roi": 1, "x": 8, "y": 8, "w": 64, "h": 64 } }
  ]
}
```

Map planes with `analysis.channelRoles` (`brightfield`, `effector`,
`deathMarker`) plus `analysis.channels.{mask,signal}`. Crop does not drop
unnamed extra channels; they remain in the stack even when a role is omitted.

Try the layout without a microscope file:

```sh
vp run fixture:workspace -- --assay killing --stage cropped --out /tmp/kill-crop --force
vp run fixture:workspace -- --assay killing --stage annotated --out /tmp/kill-ann --force
```

The killing fixture uses C0 brightfield, C1 signal, C2 T-cell, and seeds tumor /
T-cell annotation ids.

## What this repo does not do yet

Leave these for `lisca-killing-assay` or a workstation notebook:

- Killing-specific promptable / foundation classifiers (T vs tumor, death)
- Tumor vs T-cell instance segmentation and Trackpy linking
- Engagement multiplicity (`n_episodes`, `n_unique_T`) as first-class science
- Stage XY / global T identities (source readers do not expose stage coordinates today)

Occupancy (empty vs occupied **patterns**) is a lisca product path, not a
killing sidecar: see [`occupancy-prompt-pack.md`](./occupancy-prompt-pack.md).
Do not retrain the Smart exclude ResNet per user — prompt with examples.

The reserved `sidecar/` filenames and `channelRoles` / open annotation labels
are the hooks those tools should write against.

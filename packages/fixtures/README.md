# Workspace fixtures (`@lisca/fixtures`)

On-disk **sample** image sources and half-finished workspaces for e2e tests and
agents. These are not the Studio analysis demo (`apps/studio/demo` /
`@lisca/analysis/fixtures`), which is browser-only placeholder PNGs for visual
iteration.

Each stage is a real directory Studio or the CLI can open: `assay.json`,
`bbox/`, `align/`, `roi/PosN/`, `annotations/`, transfection
`analysis/PosN/{chC,auc,fit}.csv` plus `results/` (workspace boxplots and
`results/<sample>/` packs), and killing `timeseries/PosN/chN.csv` plus flat
`results/*.{csv,png}`. Filenames match the pipelines.

Images are tiny (16×16 source PNGs, 4×4 ROI TIFFs, 32×18 plot PNGs) and labeled
as sample data (`FIXTURE.txt`, assay names end with `(fixture)`).

## Stages

| Stage       | What you get                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `source`    | Templated image folder only (`Pos{p}/img_channel{c}_position{p}_time{t}_z{z}.png`)                          |
| `assay`     | Workspace + valid `assay.json` + `source/` (no alignment)                                                   |
| `aligned`   | + `bbox/PosN.csv` and `align/PosN.json`                                                                     |
| `cropped`   | + `roi/PosN/index.json` and `RoiN.tif` stacks                                                               |
| `annotated` | + `annotations/labels.json` and one frame annotation per ROI                                                |
| `analyzed`  | Transfection: `analysis/PosN/*.csv` and `results/<sample>/` packs. Killing: `timeseries/` + flat `results/` |

Stages are cumulative except `source`, which is not a workspace. Skip ahead by
picking the stage **before** the step you want to test.

Assays: `transfection` | `killing` (the two shipping next month).

## Commands

From the repo root:

```sh
# Only test align — source + assay.json, no boxes yet
vp run fixture:workspace -- --assay transfection --stage assay --out /tmp/tf-align

# Only test crop — alignment already saved
vp run fixture:workspace -- --assay killing --stage aligned --out /tmp/kill-crop

# Only test analysis — ROI stacks present, no results yet
vp run fixture:workspace -- --assay transfection --stage cropped --out /tmp/tf-analyze

# Finished workspace for result review / agent inspection
vp run fixture:workspace -- --assay killing --stage analyzed --out /tmp/kill-done --force
```

Equivalent:

```sh
vp run --filter @lisca/fixtures fixture -- --assay transfection --stage cropped --out /tmp/tf-analyze
```

`--out` must be empty unless you pass `--force`. The generator overwrites the
files it writes; use a dedicated directory.

## Library API (agents / e2e)

```ts
import { materializeFixture } from "@lisca/fixtures";

const { out } = materializeFixture({
  assay: "transfection",
  stage: "cropped",
  out: "/tmp/tf-analyze",
  force: true,
});
// Point Studio, lisca-analyze, or an e2e test at `out`.
```

`expectedKeyPaths(assay, stage)` lists the files a smoke test should see.

## Layout (tiny, real shapes)

- 2 positions (`Pos1`, `Pos2`), 2 ROIs, 3 timepoints, 2 channels, 1 Z
- Folder template: `Pos{p}` / `img_channel{c}_position{p}_time{t}_z{z}`
- ROI stacks: `roi/PosN/RoiN.tif` + slim `index.json` (`axisOrder: TCZYX`)
- Alignment: `bbox/PosN.csv` (`roi,x,y,w,h`; optional `i,j`; identity is `roi` only) and `align/PosN.json`
- Transfection analysis CSVs: `analysis/PosN/chC.csv` (`roi,t,area,background,sum,corrected`), `auc.csv` (`roi,auc`), `fit.csv` (`roi,baseline_intensity,protein_lifetime,mrna_lifetime,onset_time,expression_rate,success`)
- Killing timeseries: `timeseries/PosN/chN.csv` (`roi,t,p_dead`)
- Transfection plots: workspace boxplots at `results/*.png` and per-sample PNGs
  at `results/<sample>/` from the `@lisca/analysis` catalog. Killing plots stay
  flat under `results/`. Studio displays these PNGs; it does not re-render
  charts from CSVs.

## Tests

```sh
vp run --filter @lisca/fixtures test
```

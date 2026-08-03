# LiSCA domain language

## Workflow

- **Image source** — an ND2 file, CZI file, or templated image folder that supplies
  position, channel, time, and Z frames.
- **Workspace** — the on-disk experiment directory containing alignment, ROI,
  annotation, assay, and result artifacts.
- **Align session** — the interactive workflow that registers a frame to the
  micropattern grid, excludes unusable sites, saves site boxes, and starts ROI crop.
- **ROI crop** — creation of per-site TIFF stacks and an index from saved alignment boxes;
  runs in Studio or via CLI (`lisca-crop`; Python goal source in `../pyama-v2`), not in the light Aligner shell.
  boxes while preserving position and site identity.
- **Annotation session** — the interactive workflow that loads an ROI frame, edits
  its classification or segmentation mask, tracks history, and saves the annotation.
- **Assay** — the typed experiment description in `assay.json`, including the assay
  kind, source, positions, channels, timing, and analysis configuration.
- **Analysis run** — an Operation that executes the assay pipeline and writes
  result tables and plots.

## Background work

- **Operation** — one user-requested unit of background work, presented and tracked
  as a single aggregate even when it fans out internally.
- **Task** — the smallest independently scheduled part of an Operation; it is kept
  bounded enough to run, retry, or fail without treating the whole Operation as one
  indivisible computation.
- **Queue** — the scheduler-owned ordered set of runnable Tasks. Users create
  Operations, not Queues.

## Product composition

- **Aligner** hosts an Align session.
- **Annotator** hosts an Annotation session.
- **Studio** composes assay setup, Align and Annotation sessions, an Analysis run,
  and result review in one workflow.

## Transfection kinetic parameters (display language)

Gene-expression fits use the **basic translation–degradation model** (Müller et al.
2024 Eq. 3; **no protein maturation**). Prefer paper display terms; CSV column ids
may keep historical names:

| Display label | CSV / field id | Paper symbol |
| --- | --- | --- |
| onset time | `translation_onset` | \(t_0\) |
| expression rate | `expression_rate` (legacy alias: `transfection_efficiency`) | \(m_0 k_{TL}\) |
| mRNA lifetime | `mrna_lifetime` | \(\tau_\mathrm{mRNA}\) |
| protein lifetime | `protein_lifetime` | \(\tau_\mathrm{EGFP}\) |
| intensity offset | `intensity_offset` | baseline nuisance (not a kinetic rate) |
| AUC | `auc` | integrated protein output |

Do **not** label \(m_0 k_{TL}\) as “transfection efficiency” in UI or plots;
reserve “efficiency” for delivery/escape fractions when that concept appears.

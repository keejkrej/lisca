# ADR-0009: One workspace holds every killing kind

- **Status:** accepted
- **Date:** 2026-10-09

## Decision

Death reporter, label-free, and engagement share one Workspace and one set of
ROIs. Each kind writes its own results. Engagement counts go to
`traces/engagement/` and `results/engagement_counts.csv` /
`results/engagement_summary.csv`. They do not replace
`traces/Pos{n}/ch{m}.csv` or the death-reporter files under `results/`.

## Why

The three kinds measure different things from the same crops: expression is a
different assay, but the killing kinds are the same cells. Copying `roi/` per
kind would drift as soon as someone re-crops. Mixing the CSVs would make a
later death-reporter run look like an engagement run, and the other way around.

Rejected alternatives:

- A second Workspace per kind. The crops would be duplicated, and a re-crop
  would have to be repeated by hand.
- One results directory whose column set depends on which kind ran last. The
  next kind would erase the previous modality.

## Looks like a bug when

- Engagement stays off the Studio assay picker. The pipeline is registered and
  the card is visible, but it is not selectable until it is enabled.
- A death-reporter Workspace grows `results/engagement_*.csv` only after an
  engagement run. Those files are not cytotoxicity traces.
- Re-running death reporter does not delete engagement files, and an engagement
  run does not delete `traces/Pos{n}/ch{m}.csv`.

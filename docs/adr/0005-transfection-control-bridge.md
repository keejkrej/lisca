# ADR-0005: Transfection batch comparison is an offline script

- **Status:** accepted
- **Date:** 2026-10-06

## Decision

We will compare transfection batches with an offline Python script, not inside the analysis pipeline, because two Workspaces do not always share an expressing Sample and the assay run must not ask which Sample is the Control.

When the person running the script names that shared Sample in each Workspace, the script rescales the second Workspace onto the first with `intensity' = gain * intensity + offset`. The gain is the ratio of the Controls' median expression rates. The offset then matches their median baseline intensities.

## Why

A microscope change is a gain and an offset. Expression rate carries the gain. Baseline intensity carries the offset. Onset time and the lifetimes are times, so they stay as fitted. An untreated blank has no expression rate and cannot set the gain.

That rescale is a comparison someone runs later. It is not a step every Workspace can take. Putting it in Studio would require a Control on the assay, including for experiments that have nothing to bridge to.

Rejected alternatives:

- Ask for a Control during assay setup, and harmonize as part of the analysis run.
- Divide every Trace by its own baseline, or by an untreated well. That drops the microscope gain that expression rate is measuring.
- Quantile normalization, ComBat, or flow-cytometry batch models. Those warp the distribution and do not keep a kinetic parameter.
- Bead calibration to MESF. Use that when a bead was imaged with the cells. This script uses the expressing Sample the two experiments already share, and only when they do.

The Control location is the median. One outlier cell does not move the scale.

## Looks like a bug when

- Analysis refuses to run, or asks which Sample is the Control.
- The script rescales a Workspace when no Control names were passed.
- Harmonized onset times and lifetimes differ from the fitted values.
- A blank, or a Control whose expression rate is zero, is accepted as the bridge.

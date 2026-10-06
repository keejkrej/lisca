# Comparing transfection batches

This is not an analysis stage. Two finished Workspaces can be compared after the fact, including when they were acquired on different microscopes. Harmonizing them is optional. It is possible only when both contain the same expressing Sample, and the script does not ask for that Sample unless you pass it.

The script writes one table of single-cell fits and one table of single-cell Traces. With no Control names, those tables stay in each Workspace's own intensity units. With a Control name for each Workspace, the second Workspace is rescaled onto the first.

## What a microscope changes

A fluorescence image is a gain times the true signal, plus an offset. Gain covers exposure, laser power, camera gain, objective, and filters. Offset covers camera background and autofluorescence. Waters (2009) is the microscopy statement of that limit: intensities are not comparable across acquisitions until the acquisition parameters are accounted for. Halter et al. (2014) show the same thing with a reference glass: changing camera gain or inserting a beamsplitter multiplies the measured signal, and dividing by the reference brings it back.

This assay has no reference glass. The Control Sample is the reference. It was transfected the same way in both Workspaces, so a difference in its expression rate is the microscope gain, and a difference in its baseline intensity is the offset.

Under the basic translation–degradation model the fitted expression rate is proportional to that gain, and the fitted baseline intensity is the offset. Onset time and the two lifetimes are times. They do not take the gain.

Bead standards (MESF) would put both microscopes on an absolute fluorescence unit. Use those when a bead was imaged with the cells. They are not a substitute for the Control these experiments already include.

Distribution matching (quantile normalization, ComBat, flow-cytometry batch models) is the wrong tool. It moves cells so the histograms agree, and it does not keep a kinetic parameter.

## The bridge

For each Workspace, take the Control Cells that fitted. Drop non-finite values. The Control scale is the linear median of `baseline_intensity` and the linear median of `expression_rate`. The median is the robust center used for assay controls; a mean follows one outlier cell.

Let the reference Control be `(B_r, R_r)` and the query Control be `(B_q, R_q)`.

```text
gain   = R_r / R_q
offset = B_r - gain * B_q
```

`R_r` and `R_q` must be positive. A blank or an untransfected well has no expression rate and cannot set the gain.

For every query Cell:

```text
intensity'          = gain * intensity + offset
baseline_intensity' = gain * baseline_intensity + offset
expression_rate'    = gain * expression_rate
```

Onset time, mRNA lifetime, and protein lifetime stay as fitted. AUC includes the baseline over the whole acquisition, so recompute it from the harmonized Trace rather than scaling the old AUC.

Run it from `python/` when you want a comparison. `WORKSPACE_A` keeps its scale. `WORKSPACE_B` is the one that gets rescaled, and only if both `--control-*` names are set.

```sh
uv run python scripts/compare_transfection_batches.py \
  WORKSPACE_A WORKSPACE_B --out comparison

uv run python scripts/compare_transfection_batches.py \
  WORKSPACE_A WORKSPACE_B --out comparison \
  --control-a "eGFP control" --control-b "eGFP control"
```

The script reads `analysis/Pos{n}/fit.csv` and `analysis/Pos{n}/ch{c}.csv`. It writes `fits.csv` and `traces.csv` under `--out`, and `bridge.json` only when a Control was named. It does not modify either Workspace. The choice to keep this out of the analysis run is [ADR-0005](../adr/0005-transfection-control-bridge.md).

## Sources

- Waters JC. Accuracy and precision in quantitative fluorescence microscopy. *J Cell Biol.* 2009;185(7):1135-1148. doi:10.1083/jcb.200903097
- Halter M, Bier E, DeRose PC, Cooksey GA, Choquette SJ, Plant AL, Elliott JT. An automated protocol for performance benchmarking a widefield fluorescence microscope. *Cytometry A.* 2014;85(11):978-985. doi:10.1002/cyto.a.22519

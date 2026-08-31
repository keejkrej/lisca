# Workspace table schemas

On-disk CSV/XLSX column contracts. One name only — no aliases.

## `bbox/PosN.csv`

Required columns: `roi`, `x`, `y`, `w`, `h`.

Optional: `i`, `j` (grid indices from Aligner).

The identity column is **`roi` only**. `crop` is not an alias and is not
accepted. Rename old files manually (`crop` → `roi`) before crop/CLI/Studio
will read them.

## Transfection analysis CSVs (`analysis/PosN/`)

Traces (`chC.csv`): `roi`, `t`, `area`, `background`, `sum`, `corrected`.
`background` and `sum` are QC columns. No `pos` / `slide_channel` (`t` from
`index.json` `timeIndices`). Optional `channel` when that Pos has multiple
signal CSVs.

AUC (`auc.csv`): `roi`, `auc` (same optional `channel` rule).

Fit (`fit.csv`): `roi`, `baseline_intensity`, `protein_lifetime`,
`mrna_lifetime`, `onset_time`, `expression_rate`, `success` (same optional
`channel` rule).

Internal solver fields — **not** written to `fit.csv` / `fit.xlsx`:
`expression_amplitude`, `protein_degradation_rate`, `mrna_degradation_rate`.

## Transfection per-sample XLSX (`results/<sample>/`)

Same measure columns as the analysis CSVs, plus identity prefix `pos`.
Optional `channel` when multi. No `slide_channel` / `sample` columns (the
folder is the sample). Traces keep `background` and `sum`.

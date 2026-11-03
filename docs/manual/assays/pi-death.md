# PI death reporter

**What it measures:** propidium iodide (PI) uptake per pattern spot over time. PI enters cells whose membrane is compromised, so a rising signal marks dying cells.

**How it is computed:** each ROI crop is treated as one cell, with no segmentation. For each frame and channel, the background \( B \) is the 10th percentile of all crop pixels, and the corrected signal is

$$ F_\text{corr} = \sum_{p} I_p - N\,B $$

with \( N \) the number of pixels in the crop. There is no fit and no classifier.

**Not yet available:** a dead/alive threshold giving dead-cell counts over time. Until then, apply your own threshold to the `corrected` column.

**Input:** a fluorescence time-lapse with a fixed interval (required; the default is 5 min).

**Outputs:** `analysis/Pos{n}/ch{m}.csv` (columns `roi, t, area, background, sum, corrected`), `results/<sample>/traces.xlsx`, and trace and summary plots (mean, median, IQR).

!!! quote "Cite this method"
    Background: 10th percentile of each ROI crop, subtracted per frame as area × background. LISCA does not classify cells as dead or alive. A citable reference for LISCA is in preparation.

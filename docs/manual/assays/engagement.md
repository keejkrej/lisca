# T-cell engagement

**What it measures:** per frame, how many T cells are present and how many touch a tumour cell.

1. **Tumour mask:** Otsu threshold on the brightfield crop. The minority side is kept.
2. **T-cell threshold**, one per position: from the signal-pixel histogram over all ROIs and frames, take the median as the baseline, \( \sigma = 1.4826 \cdot \text{MAD} \), and \( T = \text{median} + 8\sigma \). Pixels above \( T \) count as T cell. The factor 8 is fixed in this version and can't be changed by the user; it sets what counts as a T cell.
3. **Splitting touching cells:** distance-transform watershed with nominal diameter \( D = 10 \) px (seeds at least \( 0.55D \) apart, at depth at least \( 0.25D \)).
4. **Size filter:** a spot is kept if its equivalent diameter is 7–13 px (\( 0.7D \) to \( 1.3D \)).

**Counts per ROI and frame (whole numbers):** `t_cells`, `engagements` (spots touching the tumour mask), and `tumor_cells`. Summary plots show means over ROIs, so fractional values like 0.5 are expected.

**Outputs:** `analysis/Pos{n}/engagement.csv`, `engagement_summary.csv`, `results/<sample>/engagement.xlsx`, `engagement_summary.xlsx`, and trace plots.

!!! quote "Cite this method"
    Otsu (1979), as above; robust threshold via the median absolute deviation. A citable reference for LISCA is in preparation.

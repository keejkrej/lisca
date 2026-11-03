# LNP binding

**What it measures:** fluorescent particles binding to each cell over time.

- **Spot detection:** Picasso-style net-gradient spot identification followed by a 2D Gaussian fit. Parameters: `minGradient` (default 50) and `boxSize` (odd, at least 3, default 7).
- **Per ROI and frame:** `spot_count`, `intensity_sum`, and `cumulative_count`. A spot counts as new if it is at least 5 px from every earlier spot in that ROI.

**Outputs:** `spots.csv`, `binding.csv`, `binding_summary.csv`, plus xlsx and plots.

!!! quote "Cite this method"
    Spot detection: J. Schnitzbauer et al., *Nat. Protoc.* 12, 1198–1228 (2017). Software: LISCA `[citation]`.

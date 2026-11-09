# Transfection kinetics

**What it measures:** expression of a fluorescent reporter after mRNA delivery, per cell, over time. It reports onset time, expression rate and the mRNA and protein half-lives.

**Input:** a phase-contrast channel (for segmentation) and a fluorescence channel (the reporter), imaged at a fixed interval (default 10 min).

## Segmentation

Each frame of the phase-contrast channel is segmented into cell versus background:

1. Local variance filter: local standard deviation \( \sqrt{E[I^2]-E[I]^2} \) over a \( (2r+1)^2 \) window, \( r = 2 \).
2. Gaussian smoothing, \( \sigma = 1.0 \) px.
3. Otsu threshold on the 8-bit histogram. Pixels above it are cell.
4. Holes are filled.

**Mask area** is the number of cell pixels in the ROI. Double cells are **not** split, so exclude them in step 2.

**Skipping segmentation** treats the whole crop as the cell and changes the background rule (below). Studio and the notebooks both follow the Skip segmentation switch in `assay.json`. [Studio, then the notebooks](../paths.md).

## Background correction

Recomputed for every ROI in every frame, on the fluorescence channel.

- **With segmentation:** the background \( B \) is the median of the pixels _outside_ the cell mask \( M \).
  $$ F_\text{corr} = \sum_{p \in M} I_p - |M|\,B $$
- **Segmentation skipped:** \( B \) is the 10th percentile of all pixels in the crop, and the sum runs over the whole crop.

This is a local, per-cell background, not a polynomial fit over the full image (as in Schwarzfischer et al.). Because each cell sits on its own pattern spot, the pixels around it are the most direct estimate of its local background.

## Kinetic model

LISCA fits the translation–degradation model without maturation (Müller et al. 2024, Eq. 3):

$$ F(t) = b + A\left(e^{-\beta (t-t_0)} - e^{-\delta (t-t_0)}\right), \quad t \ge t_0; \qquad F(t) = b, \quad t < t_0 $$

with \( \delta > \beta \) and \( A > 0 \). It follows from \( \dot m = -\delta m \) and \( \dot G = k_{TL}\, m - \beta G \).

**How it is fitted:**

- \( b \) and \( A \) are solved by linear least squares for each candidate \( (\beta, \delta, t_0) \). Rates are searched on a log-spaced grid (24 coarse values, then 2 refinements of 12), minimising the sum of squared errors.
- **Pass 1** fits \( \beta, \delta \) per cell with \( t_0 = 0 \).
- **Pass 2** fixes \( \beta \) to the median over all successful cells, then fits \( \delta \) and \( t_0 \) per cell, with \( t_0 \le \) 120 min by default.
- **Every cell therefore shares one protein degradation rate.**
- A trace fails with fewer than 3 points or no signal.

| Output column        | Meaning                                                 |
| -------------------- | ------------------------------------------------------- |
| `onset_time`         | \( t_0 \)                                               |
| `expression_rate`    | \( A(\delta-\beta) = m_0 k_{TL} \)                      |
| `mrna_lifetime`      | \( \ln 2/\delta \), a **half-life**                     |
| `protein_lifetime`   | \( \ln 2/\beta \), a **half-life**, shared by all cells |
| `baseline_intensity` | \( b \)                                                 |

**Half-life versus mean lifetime:** the columns named `lifetime` are half-lives, \( t_{1/2} = \ln 2/k \). The mean lifetime is \( \tau = 1/k = t_{1/2}/\ln 2 \approx 1.44\, t_{1/2} \). Say which one you report.

**AUC** is the trapezoidal integral of \( F_\text{corr} \) over time in minutes.

## Outputs

`analysis/Pos{n}/ch{m}.csv` (columns `roi, t, area, background, sum, corrected`), `auc.csv` and `fit.csv`, plus `results/<sample>/traces.xlsx`, `auc.xlsx`, `fit.xlsx` and the plots.

**Apparent values:** the model has no maturation step, so `onset_time` includes the reporter's maturation time and the half-lives are apparent, not molecular. Expect an offset against fits that model maturation explicitly.

**Fitting your own model:** this fit is a first overview. To use another model, for example one with maturation for slow-maturing fluorophores, fit the `corrected` column in `traces.xlsx` yourself.

**Limitation:** the model assumes a single delivery with exponential decay. It doesn't describe, for example, a knock-down after a second transfection.

!!! quote "Cite this method"
    Background: median of non-cell pixels in each ROI, subtracted per frame as area × background (or the 10th percentile of the crop if segmentation was skipped; say which). Kinetic model: Müller et al. 2024. Segmentation threshold: N. Otsu, _IEEE Trans. Syst. Man Cybern._ 9, 62–66 (1979). A citable reference for LISCA is in preparation.

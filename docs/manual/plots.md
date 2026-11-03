# Reading the plots

- **Trace plot:** one line per cell, `corrected` intensity versus time.
- **Summary plot:** mean (line), median, and the interquartile range (IQR, band from the 25th to the 75th percentile). The mean can sit above the IQR when a few cells are very bright: one bright outlier pulls the mean up but not the quartiles.
- **Mask area:** cell pixels per ROI over time. Sudden jumps often mean a second cell entered the spot.
- **Fit and parameter plots:** the fitted curves and distributions of the fit parameters (transfection only). The AUC boxplot uses a log axis.

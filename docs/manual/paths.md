# Studio, then the notebooks

Define the assay and align in Studio. Crop and transfection analysis can continue in the Jupyter notebooks. The notebooks read `assay.json` and the ROI boxes. They do not ask for samples again.

Death reporter, engagement, and LNP binding finish in Studio.

## In Studio

1. Choose **Transfection**.
2. On **Metadata**, set the image source, the output folder, the interval, the channels, and each sample. Save. Those fields are the assay.
3. **Align.** Switch off empty patterns and any pattern with two cells. Save each position. That writes `bbox/Pos{n}.csv`.

Sample positions are the labels from the acquisition. A Nikon or Zeiss file usually shows 1, 2, 3, …. A TIFF folder shows the folder number, such as 138.

**Skip segmentation** chooses the trace, and the notebooks follow it.

- Off, the default: Otsu mask, median background outside the mask.
- On: the whole crop, 10th-percentile background.

**Annotate** is optional. A label does not remove an ROI. Analysis measures every cropped ROI.

## In the notebooks

Open the same output folder.

1. `crop.ipynb` crops the ND2 or CZI from Metadata, and only the positions that have a saved grid. Crop a TIFF folder in Studio, then continue with the next notebook.
2. `analyze.ipynb` runs segment, traces, AUC, and the fit from `assay.json`. Segment uses the same Otsu settings as Studio (variation radius 2, Gaussian sigma 1) when Skip segmentation is off.
3. `results.ipynb` writes the tables and plots for the samples already in `assay.json`.

Change a sample or a channel on Metadata, save, and re-run from crop when the position list changed. Re-run `results.ipynb` Plots on their own when only the figures should change.

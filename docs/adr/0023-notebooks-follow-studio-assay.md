# ADR-0023: Notebooks follow the Studio assay and alignment

- **Status:** accepted
- **Date:** 2026-11-09

## Decision

We will define the assay and align in Studio, then crop and run transfection in the notebooks from that `assay.json` and the saved ROI boxes. The notebooks do not write samples, channels, interval, or `skipSegment`. Analysis uses Otsu (variation radius 2, Gaussian sigma 1) unless Skip segmentation is on, the same rule as Studio.

## Why

Asking for the sample list again, and measuring a full-crop trace while Studio measured an Otsu mask, made the two tools disagree about which fields and which numbers the user had chosen. Metadata is the natural place to name samples, because the labels come from the acquisition. Align has to happen where the grid is drawn. JupyterHub is then the place to crop and compute.

Rejected alternatives:

- Keep a second sample list in `results.ipynb`. The same positions were typed twice, in two encodings.
- Keep the notebook on the full-crop trace. That is the split [ADR-0022](0022-two-transfection-paths.md) accepted, and this choice reverses it.
- Crop a TIFF folder in the notebook. The notebook cropper reads an ND2 or CZI. A folder is cropped in Studio, then `analyze.ipynb` still reads the assay.

## Looks like a bug when

- `results.ipynb` writes `samples[]`.
- `analyze.ipynb` sets `skipSegment` true on a workspace Studio saved with it off.
- `crop.ipynb` asks for a position list instead of the boxes Studio saved.
- A folder assay with `positionIndexVersion: 1` is cropped or analyzed as if those indices were folder numbers.

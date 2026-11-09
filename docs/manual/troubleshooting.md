# Troubleshooting

- **Crop fails on one position with "access denied" (OS error 5).** This usually happens on network drives, which briefly lock files. Write the output folder to a local disk, then copy the results.
- **Positions don't match.** In Studio, pick positions from the detected list. The labels are NIS/ZEN names or folder numbers. The notebooks use the positions saved in `assay.json` and do not ask for the list again. [Studio, then the notebooks](paths.md).
- **The notebook trace does not match Studio.** Both follow Skip segmentation in `assay.json`. Off is the Otsu mask. On is the full crop and a 10th-percentile background. Save Metadata before running `analyze.ipynb`.
- **The pattern isn't recognised.** Check the file-name tokens in [Import](workflow.md#1-import-metadata).
- **Auto-detect misses the pattern.** Set _Detect shape_ to Square or Hex and try again, or place the grid by dragging. Detection uses island contrast on the current frame, so empty or crowded frames need a manual grid.
- **Contrast resets between frames.** Use _Lock_. Contrast never affects results.

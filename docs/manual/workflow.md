# The workflow, steps 1–5

LISCA turns a raw time-lapse into one intensity trace per cell. Each step has a single job.

These steps are the Studio path. After Metadata and Align, transfection of an ND2 or CZI can continue in the Jupyter notebooks. [Studio, then the notebooks](paths.md) is that handoff. The notebooks read the assay you saved here.

## 1. Import (metadata)

**Aim:** tell LISCA where your images are and how positions, time points and channels are encoded.

- **Source types.** A folder of TIFF files, a Nikon `.nd2` file, or a Zeiss `.czi` file. ND2 and CZI carry positions, time and channels in their own metadata. A TIFF folder relies on the file names, so you describe them with a pattern.
- **File-name pattern.** Tokens: `{p}` or `{position}`, `{t}` or `{time}`, `{c}` or `{channel}`, `{z}`. Digit width is not fixed, so `Pos1` and `Pos001` both match `Pos{p}`. Example: `img_Pos{p}_t{t}_c{c}.tif`.
- **Position numbering.** Positions are labelled as in your source files. Pick positions from the detected list rather than typing numbers.
- **Output folder.** Where LISCA writes crops, traces and results. Choose a local disk if you can (see [Troubleshooting](troubleshooting.md)).

## 2. Align

**Aim:** place a grid over the pattern array so that each pattern spot becomes one region of interest (ROI).

- Fit the grid to the pattern, then click spots to switch them on or off. Switch off empty spots and **spots with two cells**: two cells in one ROI add up to one wrong trace.
- **Auto-detect** places the grid on the current frame. Check the overlay, nudge it with the usual tools if needed, then Save. Auto-detect does not write ROI boxes on its own. If detection fails or confidence is low, place the grid by hand. Use _Detect shape_ to force Square or Hex when the inferred geometry is wrong.
- **Expert mode** exposes the pattern geometry and drift correction. Use drift correction when the stage moves during the experiment.
- **Contrast is display-only.** It never changes the numbers. Use _Lock_ to keep one contrast setting across all frames.
- Save with `Ctrl+S`, then click _Align_.

## 3. Crop

**Aim:** cut every ROI out of every frame and write it to the output folder, so the analysis works on small, cell-centred images.

## 4. Annotate (optional for fluorescence assays)

**Aim:** give LISCA human labels.

- _Classification mode:_ click a label for each cell (for example alive or dead).
- _Segmentation mode:_ draw the cell outline.

Fluorescence assays (transfection, PI) don't need annotation. Analysis measures every cropped ROI. To leave a cell out, switch that pattern off in Align before Crop.

## 5. Analyze

**Aim:** reduce each ROI to numbers over time, then fit or count, depending on the assay. The assay pages describe exactly what is computed.

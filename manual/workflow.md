# The workflow, steps 1–5

LISCA turns a raw time-lapse into one intensity trace per cell. Each step has a single job.

## 1. Import (metadata)

**Aim:** tell LISCA where your images are and how positions, time points and channels are encoded.

- **Source types.** A folder of TIFF files, a Nikon `.nd2` file, or a Zeiss `.czi` file. ND2 and CZI carry positions, time and channels in their own metadata. A TIFF folder relies on the file names, so you describe them with a pattern.
- **File-name pattern.** Tokens: `{p}` or `{position}`, `{t}` or `{time}`, `{c}` or `{channel}`, `{z}`. Digit width is not fixed, so `Pos1` and `Pos001` both match `Pos{p}`. Example: `img_Pos{p}_t{t}_c{c}.tif`.
- **Position numbering.** Positions are labelled as in your source files. Pick positions from the detected list rather than typing numbers.
- **Output folder.** Where LISCA writes crops, traces and results. Choose a local disk if you can (see [Troubleshooting](troubleshooting.md)).

## 2. Align

**Aim:** place a grid over the pattern array so that each pattern spot becomes one region of interest (ROI).

- Fit the grid to the pattern, then click spots to switch them on or off. Switch off empty spots and **spots with two cells**: two cells in one ROI add up to one wrong trace.
- **Expert mode** exposes the pattern geometry and drift correction. Use drift correction when the stage moves during the experiment.
- **Contrast is display-only.** It never changes the numbers. Use *Lock* to keep one contrast setting across all frames.
- Save with `Ctrl+S`, then click *Align*.

## 3. Crop

**Aim:** cut every ROI out of every frame and write it to the output folder, so the analysis works on small, cell-centred images.

## 4. Annotate (optional for fluorescence assays)

**Aim:** give LISCA human labels.

- *Classification mode:* click a label for each cell (for example alive or dead).
- *Segmentation mode:* draw the cell outline.

Fluorescence assays (transfection, PI) don't need annotation. Use this step to check crops and drop bad ones before analysis.

## 5. Analyze

**Aim:** reduce each ROI to numbers over time, then fit or count, depending on the assay. The assay pages describe exactly what is computed.

# LiSCA

Live-cell single-cell analysis: turning time-lapse microscopy of cells on
micropattern arrays into per-cell measurements for an assay.

## Language

### Imaging

**Image source**:
The acquisition LiSCA reads images from: an ND2 file, a CZI file, or a templated
image folder.

**Frame**:
An integer index along the time axis (0, 1, 2, …). "The image at a Frame" means
one 2D image for a given Position, Channel, and Z plane.
_Avoid_: time index

**Timepoint**:
The real time of a Frame, in time units: its Frame times the Interval.
_Avoid_: using "timepoint" for the integer index

**Interval**:
The real time between consecutive Frames.
_Avoid_: frame rate

**Position**:
One microscope stage position in the Image source; a single field of view imaged
over time.
_Avoid_: FOV, field, tile

**Channel**:
One imaging channel of the Image source, such as brightfield or a fluorescence
channel. Bare "channel" always means this.

**Slide channel**:
A physical lane of the microscope slide. By convention one Slide channel holds
one Sample, but analysis never uses Slide channels. Always qualified as "slide
channel".
_Avoid_: bare "channel", lane

**Sample**:
A named group of Positions that analysis reports on together, typically one
experimental condition.
_Avoid_: condition, group

**Segmentation channel**:
The Channel an analysis segments cells from.
_Avoid_: Mask channel

**Signal channel**:
The Channel an analysis measures intensity in.

### Micropatterns

**Pattern**:
One micropattern on the slide, and the matching slot in the alignment grid. A
Pattern holds at most a few biological cells.
_Avoid_: cell, grid cell, site, well

**ROI**:
A Pattern kept after alignment, identified within its Position, with a saved
box and, once cropped, its own image stack.
_Avoid_: Site, crop

**Cell**:
A biological cell. Never a grid slot.

### Workflow

**Workspace**:
The on-disk directory holding everything for one experiment: the Assay,
alignment, ROIs, annotations, and results.
_Avoid_: project, experiment folder, dataset

**Align session**:
The interactive workflow that fits the Pattern grid to a frame of a Position,
excludes unusable Patterns, and saves the ROI boxes.
_Avoid_: registration

**Exclusion**:
Marking a Pattern as unusable so it does not become an ROI. **Smart exclude** is
the model-assisted form.
_Avoid_: Auto exclude

**ROI crop**:
A Task producing per-ROI image stacks from the saved ROI boxes, preserving
Position and ROI identity.

**Annotation session**:
The interactive workflow that loads an ROI frame, edits its classification or
Mask, and saves the annotation.

**Mask**:
A per-pixel label image for an ROI frame, drawn by hand or with **Smart segment**
(click-prompted segmentation).

**Assay**:
The typed description of one experiment: its assay kind, Image source,
Positions, Channels, timing, and analysis configuration.

**Analysis run**:
A Task that executes the Assay's analysis over its Samples and writes Traces,
result tables, and plots.

**Trace**:
The measured intensity of one ROI across Frames.
_Avoid_: timeseries

### Background work

**Task**:
One unit of background work a user starts and follows to completion. ROI crop
and Analysis run are the two kinds.
_Avoid_: Operation, job

### Products

**Aligner**:
The product that hosts an Align session.

**Annotator**:
The product that hosts an Annotation session.

**Studio**:
The product that composes Assay setup, Align and Annotation sessions, an Analysis
run, and result review in one workflow.

### Transfection kinetics

Fits use the basic translation–degradation model (Müller et al. 2024, Eq. 3; no
protein maturation).

**Onset time** (t0):
When expression of the transfected gene begins.
_Avoid_: transfection efficiency, translation onset, transfection onset

**Expression rate** (m0 k_TL):
The initial mRNA amount times the translation rate.
_Avoid_: efficiency (reserved for delivery and escape fractions)

**mRNA lifetime** (τ_mRNA):
The mRNA half-life, ln(2)/δ. Not 1/δ.

**Protein lifetime** (τ_EGFP):
The reporter protein half-life, ln(2)/β. Not 1/β.

**Baseline intensity**:
The additive background level of a Trace; not a kinetic rate.

**AUC**:
The integrated protein output of a Trace.

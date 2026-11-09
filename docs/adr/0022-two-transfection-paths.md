# ADR-0022: Studio and the notebooks keep separate transfection traces

- **Status:** superseded
- **Date:** 2026-11-09
- **Superseded by:** [ADR-0023](0023-notebooks-follow-studio-assay.md)

## Decision

We will keep two transfection paths on one workspace layout. Studio’s default trace is the Otsu mask. The notebooks’ trace is the full crop with a 10th-percentile background, and they write `analysis.skipSegment: true`. `crop.ipynb` records an ND2 or CZI on `assay.json`. `results.ipynb` writes `samples[]` with `positionIndexVersion: 1` for that file. The notebooks refuse a TIFF-folder source, a non-transfection assay type, and a workspace already saved with `skipSegment: false`.

## Why

The paths ask the user for different position numbers, and they measure a different trace unless Studio’s Skip segmentation box is on. Letting `analyze.ipynb` overwrite an Otsu assay, or letting `results.ipynb` store folder labels as version-1 indices, selects the wrong fields and describes the wrong background. Running Otsu inside the notebook would change every existing notebook analysis. Making Skip segmentation the Studio default would change the method the manual publishes.

Rejected alternatives:

- One path only. JupyterHub users keep a transfection notebook, and Studio users keep Metadata.
- Notebooks call the Otsu segment step and default to it. Existing notebook traces would change on the next template update.
- Studio defaults to the full-crop trace. The published transfection method is the Otsu mask.

## Looks like a bug when

- `analyze.ipynb` sets `skipSegment` true on a workspace that was saved false and still writes full-crop CSVs.
- `results.ipynb` writes a TIFF folder’s labels with `positionIndexVersion: 1`.
- `crop.ipynb` leaves `data.path` empty, so Studio cannot reopen the ND2 or CZI.
- The manual tells a Studio user to drop cells in Annotate. Exclusion is the pattern switch on Align.

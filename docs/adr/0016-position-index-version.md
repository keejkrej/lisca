# ADR-0016: Position ranges are versioned 0-based indices

- **Status:** accepted
- **Date:** 2026-10-28

## Decision

We will store `samples[].positions` as 0-based indices into the source
position list, mark that encoding with `positionIndexVersion: 1`, and never
show those indices. The UI, crop prompt, and plots display each source's own
labels (folder-name numbers; ND2/CZI stored names, otherwise 1-based NIS/ZEN).
A file without the version marker uses the pre-0.5.1 rules (folder name, then
index; ND2/CZI already indices). Loaders migrate that file to version 1 with
the same physical positions, or refuse with a message — they do not guess a
neighbour.

## Why

Folder sources used the folder number as the request id (`Pos138` is 138) while
ND2/CZI used a 0-based index. The Metadata editor always subtracted one from
typed numbers, so a range that looked like 1–67 selected Pos001–Pos066 on a
folder source and could fall through to a neighbouring index when a number was
missing. Keeping one hidden 0-based index, showing source labels, and versioning
the stored string makes a typed range mean the same positions on every source.

Rejected alternatives:

- Keep storing folder numbers and only stop subtracting one in the UI. ND2/CZI
  and folder `assay.json` would still disagree about what `3` means.
- Treat a missing version as version 1. An old folder `138` would become the
  139th position.
- Rename `bbox/Pos{n}` and `roi/Pos{n}` onto the new indices. Existing
  workspaces would lose alignment unless every file was rewritten from the
  source list.

On-disk `Pos{n}` identity stays `WorkspaceScan.positions` (folder number or
ND2/CZI index). Version 1 numbers are indices into that list.

## Looks like a bug when

- A pre-0.5.1 `assay.json` without `positionIndexVersion` loads and silently
  shifts to neighbouring positions.
- Metadata chips show 0-based indices, or a typed folder range 138,144 selects
  the first two detected folders instead of Pos138 and Pos144.
- Analysis of a version-1 file runs without the image source and treats indices
  as `Pos{n}` names.

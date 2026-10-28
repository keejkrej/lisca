# Studio troubleshooting

Common errors after opening a workspace in Studio. Domain terms stay in
[`CONTEXT.md`](../../CONTEXT.md).

## Crop ROI: access denied (Windows `os error 5`)

The crop task writes each position to a staging folder, then renames it into
`roi/`. Antivirus or cloud-sync software can hold the new TIFF open. Studio
retries the rename and continues with the other positions. A failed Crop ROI
task can be dismissed from Task Center (click the task to expand its steps).
Already cropped positions stay on disk; drop only the failing position on
Metadata if you need to retry a subset.

## Position `67` did not select Pos067

Typed ranges match the **source labels** (folder names, or NIS/ZEN 1-based
names). Studio stores 0-based indices and writes `positionIndexVersion: 1`.
A range without that field is the pre-0.5.1 encoding. Studio migrates it to
the same physical positions or refuses with a message. It never silently
shifts to a neighbour.

## Killing looks auto-stretched on load

Frames load at the raw intensity domain. Press **Auto** to fit this frame, which
also **Lock**s that window onto every frame. Contrast is display-only; analysis
uses the original intensities.

## Task Center looks stuck

Click the task row (chevron) to see per-position steps. Dismiss a finished
failed task after you have the progress you need. Partial crop success still
refreshes ROI on Annotate.

## Folder naming pattern

`{p}` / `{position}`, `{t}` / `{time}`, `{c}` / `{channel}`, and `{z}` are the
tokens. Subfolder and filename are both required. Digit width is not fixed:
`Pos1` and `Pos001` both match `Pos{p}`.

import type { RoiWorkspaceScan } from "@lisca/contracts";

export type StudioAnnotateRoi = {
  pos: number;
  roi: number;
};

/** Returns the next ROI in scan order without wrapping at the end. */
export function nextStudioAnnotateRoi(
  scan: RoiWorkspaceScan | null | undefined,
  selection: { pos: number | null; roi: number | null },
): StudioAnnotateRoi | null {
  const positions = scan?.positions ?? [];
  const currentPositionIndex = positions.findIndex((position) => position.pos === selection.pos);

  if (currentPositionIndex < 0) {
    const firstPosition = positions.find((position) => position.rois.length > 0);
    const firstRoi = firstPosition?.rois[0];
    return firstPosition && firstRoi ? { pos: firstPosition.pos, roi: firstRoi.roi } : null;
  }

  const currentPosition = positions[currentPositionIndex]!;
  const currentRoiIndex = currentPosition.rois.findIndex((entry) => entry.roi === selection.roi);
  if (currentRoiIndex < 0) {
    const firstRoi = currentPosition.rois[0];
    if (firstRoi) return { pos: currentPosition.pos, roi: firstRoi.roi };
  } else {
    const nextRoi = currentPosition.rois[currentRoiIndex + 1];
    if (nextRoi) return { pos: currentPosition.pos, roi: nextRoi.roi };
  }

  for (const position of positions.slice(currentPositionIndex + 1)) {
    const firstRoi = position.rois[0];
    if (firstRoi) return { pos: position.pos, roi: firstRoi.roi };
  }

  return null;
}

/** Returns the previous ROI in scan order without wrapping at the start. */
export function previousStudioAnnotateRoi(
  scan: RoiWorkspaceScan | null | undefined,
  selection: { pos: number | null; roi: number | null },
): StudioAnnotateRoi | null {
  const rois = (scan?.positions ?? []).flatMap((position) =>
    position.rois.map((entry) => ({ pos: position.pos, roi: entry.roi })),
  );
  const index = rois.findIndex((item) => item.pos === selection.pos && item.roi === selection.roi);
  return index > 0 ? rois[index - 1]! : null;
}

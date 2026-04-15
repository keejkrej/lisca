import type { FrameResult, RoiIndexEntry } from "lisca/shared/contracts";

/** Minimal frame for provider/canvas layout before `loadRoiFrame` completes (matches ROI crop size). */
export function createPlaceholderAnnotationFrame(roi: RoiIndexEntry): FrameResult {
  const width = Math.max(1, roi.bbox.w);
  const height = Math.max(1, roi.bbox.h);
  const pixels = new Uint8Array(width * height);
  return { width, height, pixels };
}

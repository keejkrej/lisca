import type { ProductId } from "./config.ts";

/**
 * Which standalone product servers mount a given operation. Route groups follow
 * the routers merged in each app's `server/src/lib.rs`:
 *
 * - Aligner serves `/fs` and its eight lightweight `/align` routes.
 * - Annotator serves `/fs`, `/annotate`, and `/tasks`.
 * - Studio serves `/fs`, `/align` (including the crop routes), `/annotate`,
 *   `/tasks`, `/profile`, `/memory`, and `/studio`.
 */
const CROP_OPERATIONS = new Set([
  "align.cropRoi",
  "align.cancelCropRoi",
  "align.cropRoiProgress",
  "align.getLatestCropProgress",
]);

export function productsForOperation(operationId: string): ProductId[] {
  const group = operationId.split(".")[0];
  switch (group) {
    case "fs":
      return ["aligner", "annotator", "studio"];
    case "align":
      return CROP_OPERATIONS.has(operationId) ? ["studio"] : ["aligner", "studio"];
    case "annotate":
      return ["annotator", "studio"];
    case "tasks":
      return ["annotator", "studio"];
    case "profile":
    case "memory":
    case "studio":
      return ["studio"];
    default:
      return ["studio"];
  }
}

/** True when the operation's JSON payload embeds raw pixels (base64). */
export function isFramePayloadOperation(operationId: string): boolean {
  return operationId === "align.loadFrame" || operationId === "annotate.loadRoiFrame";
}

/** True when the operation's JSON payload embeds a mask PNG (base64). */
export function isMaskPayloadOperation(operationId: string): boolean {
  return operationId === "annotate.loadRoiFrameAnnotation";
}

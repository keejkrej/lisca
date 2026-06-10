import type { CropRoiProgress } from "@lisca/contracts";

/** True once a crop ROI job has reached a terminal state. */
export function isDoneCropStatus(status: CropRoiProgress["status"]): boolean {
  return status === "completed" || status === "cancelled" || status === "error";
}

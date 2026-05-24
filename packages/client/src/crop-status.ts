import type { CropRoiProgress } from "@lisca/contracts";

export function isDoneCropStatus(status: CropRoiProgress["status"]) {
  return status === "completed" || status === "cancelled" || status === "error";
}

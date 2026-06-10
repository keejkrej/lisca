import type { CropRoiProgress } from "@lisca/contracts";
import { clamp, isDoneCropStatus } from "@lisca/utils";

export type CropProgressModalState = {
  visible: boolean;
  done: number;
  total: number;
  pct: number;
  message: string;
};

export function useCropProgressModal(
  progress: CropRoiProgress | null | undefined,
): CropProgressModalState | null {
  if (!progress || isDoneCropStatus(progress.status)) return null;

  const total = Math.max(1, progress.totalRois || progress.totalPositions || 1);
  const done = progress.totalRois ? progress.completedRois : progress.completedPositions;

  return {
    visible: true,
    done,
    total,
    pct: clamp((done / total) * 100, 0, 100),
    message: progress.message ?? "Working",
  };
}

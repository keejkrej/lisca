import type { AlignGridCellCoord } from "@lisca/contracts";
import type { AutoExcludePreviewCell } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";

export const EXCLUDE_LABEL = 0;
export const INCLUDE_LABEL = 1;

export type SmartExcludeCellScore = AlignGridCellCoord & {
  excludeScore: number;
};

export type SmartExcludeDownloadProgress = {
  progress: number;
  message: string;
  file?: string;
};

export type ClassifyExclusionCandidatesOptions = {
  threshold?: number;
  batchSize?: number;
  onProgress?: (progress: SmartExcludeDownloadProgress) => void;
};

export type ClassifyExclusionInput = {
  frame: FrameResult;
  cells: readonly AutoExcludePreviewCell[];
};

import type { AlignGridPatternCoord } from "@lisca/contracts";
import type { AlignGridPatternBox } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";

export const EXCLUDE_LABEL = 0;
export const INCLUDE_LABEL = 1;

export type SmartExcludePatternScore = AlignGridPatternCoord & {
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
  patterns: readonly AlignGridPatternBox[];
};

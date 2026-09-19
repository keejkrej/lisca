import type {
  AlignGridCellCoord,
  OccupancyPromptExampleInput,
  OccupancyPromptPack,
} from "@lisca/contracts";
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

export type OccupancyPackStatus = {
  engine?: "resnet" | "promptPack";
  packReady?: boolean;
  occupiedCount?: number;
  emptyCount?: number;
  message?: string;
};

export type ClassifyExclusionCandidatesOptions = {
  threshold?: number;
  batchSize?: number;
  onProgress?: (progress: SmartExcludeDownloadProgress) => void;
  onOccupancy?: (status: OccupancyPackStatus) => void;
};

export type ClassifyExclusionInput = {
  frame: FrameResult;
  cells: readonly AutoExcludePreviewCell[];
  workspacePath?: string | null;
  persistPromptPack?: boolean;
  appendPromptExamples?: boolean;
  promptExamples?: OccupancyPromptExampleInput[];
  promptPack?: OccupancyPromptPack;
};

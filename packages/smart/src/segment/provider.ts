import type { FrameResult } from "@lisca/utils";

import type { SmartModelDownloadProgress } from "../shared/model-gate";
import type { SmartSegmentPoint } from "./types";

export type SmartSegmentPrepareOptions = {
  onProgress?: (progress: SmartModelDownloadProgress) => void;
};

export type SmartSegmentProvider = {
  prepareFrame(frame: FrameResult, options?: SmartSegmentPrepareOptions): Promise<void>;
  segment(points: SmartSegmentPoint[]): Promise<Uint8Array>;
  dispose(): void;
};

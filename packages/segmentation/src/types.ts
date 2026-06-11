import type { FrameResult } from "@lisca/utils";

export type SmartSegmentPoint = {
  x: number;
  y: number;
  /** 1 = foreground prompt, 0 = background prompt */
  label: 0 | 1;
};

export type SmartSegmentEngine = {
  prepareFrame(frame: FrameResult): Promise<void>;
  segment(points: SmartSegmentPoint[]): Promise<Uint8Array>;
  dispose(): void;
};

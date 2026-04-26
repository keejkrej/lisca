export interface CropConfirmState {
  kind: "single" | "batch";
  positions: number[];
  overwritePositions: number[];
}

export interface ActiveCropState {
  kind: "single" | "batch";
  requestId: string;
  currentPos: number;
  currentIndex: number;
  total: number;
  cancelling: boolean;
}

export function createCropRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

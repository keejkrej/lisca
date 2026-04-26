import type { FrameResult, ViewerCanvasStatusMessage } from "lisca/shared/contracts";
import type { GridCellCoord, GridState, GridWheelViewport } from "lisca/shared/core";

export interface AlignCanvasFramePoint {
  x: number;
  y: number;
}

export interface AlignCanvasPointerEvent {
  pointerId: number;
  pointerType: string;
  button: number;
  buttons: number;
  clientX: number;
  clientY: number;
  framePoint: AlignCanvasFramePoint | null;
  viewport: GridWheelViewport | null;
  preventDefault: () => void;
  capturePointer: () => void;
  releasePointer: () => void;
}

export interface AlignCanvasWheelEvent {
  deltaMode: number;
  deltaX: number;
  deltaY: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  clientX: number;
  clientY: number;
  framePoint: AlignCanvasFramePoint | null;
  viewport: GridWheelViewport | null;
  preventDefault: () => void;
}

export interface AlignCanvasSurfaceProps {
  frame: FrameResult | null;
  grid: GridState;
  previewGrid?: GridState | null;
  excludedCells?: Iterable<GridCellCoord>;
  loading?: boolean;
  emptyText?: string;
  messages?: ViewerCanvasStatusMessage[];
  className?: string;
  cursor?: string;
  onVirtualPointerDown?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerMove?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerUp?: (event: AlignCanvasPointerEvent) => void;
  onVirtualPointerCancel?: (event: AlignCanvasPointerEvent) => void;
  onVirtualWheel?: (event: AlignCanvasWheelEvent) => void;
}

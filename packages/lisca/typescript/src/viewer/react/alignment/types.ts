import type { FrameResult, ViewerCanvasStatusMessage } from "lisca/shared/contracts";
import type { GridCellCoord, GridState, GridWheelViewport } from "lisca/shared/core";

export interface ViewerCanvasFramePoint {
  x: number;
  y: number;
}

export interface ViewerCanvasPointerEvent {
  pointerId: number;
  pointerType: string;
  button: number;
  buttons: number;
  clientX: number;
  clientY: number;
  framePoint: ViewerCanvasFramePoint | null;
  viewport: GridWheelViewport | null;
  preventDefault: () => void;
  capturePointer: () => void;
  releasePointer: () => void;
}

export interface ViewerCanvasWheelEvent {
  deltaMode: number;
  deltaX: number;
  deltaY: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  clientX: number;
  clientY: number;
  framePoint: ViewerCanvasFramePoint | null;
  viewport: GridWheelViewport | null;
  preventDefault: () => void;
}

export interface ViewerCanvasSurfaceProps {
  frame: FrameResult | null;
  grid: GridState;
  previewGrid?: GridState | null;
  excludedCells?: Iterable<GridCellCoord>;
  loading?: boolean;
  emptyText?: string;
  messages?: ViewerCanvasStatusMessage[];
  className?: string;
  cursor?: string;
  onVirtualPointerDown?: (event: ViewerCanvasPointerEvent) => void;
  onVirtualPointerMove?: (event: ViewerCanvasPointerEvent) => void;
  onVirtualPointerUp?: (event: ViewerCanvasPointerEvent) => void;
  onVirtualPointerCancel?: (event: ViewerCanvasPointerEvent) => void;
  onVirtualWheel?: (event: ViewerCanvasWheelEvent) => void;
}

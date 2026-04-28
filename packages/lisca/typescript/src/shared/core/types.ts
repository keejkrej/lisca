export type GridShape = "square" | "hex";

export interface GridState {
  enabled: boolean;
  shape: GridShape;
  tx: number;
  ty: number;
  rotation: number;
  spacingA: number;
  spacingB: number;
  cellWidth: number;
  cellHeight: number;
  opacity: number;
}

export interface GridFrameBounds {
  width: number;
  height: number;
}

export interface GridWheelGestureInput {
  deltaMode: number;
  deltaX: number;
  deltaY: number;
  ctrlKey: boolean;
  shiftKey: boolean;
}

export interface GridWheelViewport {
  displayWidth: number;
  displayHeight: number;
  modelWidth: number;
  modelHeight: number;
}

export interface GridCellCoord {
  i: number;
  j: number;
}

export type ExcludedCellsByPosition = Record<number, GridCellCoord[]>;

export interface MousePointerInput {
  pointerType: string;
  button: number;
}

export interface GridPointerGestureInput extends MousePointerInput {
  pointerId: number;
  clientX: number;
  clientY: number;
}

export interface GridPointerGestureSession {
  pointerId: number;
  intent: GridPointerIntent;
  startClientX: number;
  startClientY: number;
  startGrid: GridState;
}

export interface GridCellBox extends GridCellCoord {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type GridPointerIntent = "offset" | "rotation" | "spacing" | "spacing-size";
export type GridWheelIntent = "ignore" | "size";

/** Studio align toolbar — primary mouse button maps to the selected canvas tool. */
export type AlignPatternToolMode = "pan" | "rotate" | "zoom";

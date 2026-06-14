import type { AlignGridState } from "@lisca/contracts";
import {
  applyAlignGridPointerGesture,
  beginAlignGridPointerGesture,
  type AlignGridPointerGestureSession,
  type AlignGridToolMode,
  type AlignGridWheelViewport,
} from "@lisca/utils";
import { useRef, useState, type RefObject } from "react";

export type AlignCanvasFramePoint = {
  x: number;
  y: number;
};

export type AlignCanvasPointerEvent = {
  pointerId: number;
  pointerType: string;
  button: number;
  buttons: number;
  clientX: number;
  clientY: number;
  framePoint: AlignCanvasFramePoint | null;
  viewport: AlignGridWheelViewport | null;
  preventDefault: () => void;
  capturePointer: () => void;
  releasePointer: () => void;
};

export type UseAlignCanvasGridHandlersOptions = {
  grid: AlignGridState;
  setGrid: (grid: AlignGridState) => void;
  toolMode: AlignGridToolMode;
  patternZoomLocked?: boolean;
  disabled?: boolean;
  /** Called when the in-flight preview grid changes; canvas should redraw locally. */
  onPreviewGridChange?: () => void;
};

export type AlignCanvasGridHandlers = {
  previewGridRef: RefObject<AlignGridState | null>;
  dragging: boolean;
  handlePointerDown: (event: AlignCanvasPointerEvent) => void;
  handlePointerMove: (event: AlignCanvasPointerEvent) => void;
  handlePointerEnd: (event: AlignCanvasPointerEvent) => void;
};

export function useAlignCanvasGridHandlers({
  disabled = false,
  grid,
  patternZoomLocked = false,
  setGrid,
  toolMode,
  onPreviewGridChange,
}: UseAlignCanvasGridHandlersOptions): AlignCanvasGridHandlers {
  const gestureRef = useRef<AlignGridPointerGestureSession | null>(null);
  const previewGridRef = useRef<AlignGridState | null>(null);
  const [dragging, setDragging] = useState(false);
  const notifyPreviewChange = () => {
    onPreviewGridChange?.();
  };
  const handlePointerDown = (event: AlignCanvasPointerEvent) => {
    if (disabled || !event.viewport || !grid.enabled) return;
    if (patternZoomLocked && toolMode === "zoom-pattern") return;
    if (event.pointerType === "mouse" && event.button !== 0) {
      event.preventDefault();
      return;
    }
    const session = beginAlignGridPointerGesture(grid, event, toolMode);
    if (!session) return;
    event.preventDefault();
    event.capturePointer();
    gestureRef.current = session;
    previewGridRef.current = null;
    setDragging(true);
  };
  const handlePointerMove = (event: AlignCanvasPointerEvent) => {
    const gesture = gestureRef.current;
    if (!gesture || !event.viewport || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    previewGridRef.current = applyAlignGridPointerGesture(gesture, event, event.viewport);
    notifyPreviewChange();
  };
  const handlePointerEnd = (event: AlignCanvasPointerEvent) => {
    if (gestureRef.current?.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    const committedPreviewGrid = previewGridRef.current;
    if (committedPreviewGrid) setGrid(committedPreviewGrid);
    previewGridRef.current = null;
    setDragging(false);
    notifyPreviewChange();
    event.releasePointer();
  };
  return {
    previewGridRef,
    dragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  };
}

export function cursorForAlignTool(
  toolMode: AlignGridToolMode,
  gridEnabled: boolean,
  dragging: boolean,
) {
  if (!gridEnabled) return "default";
  if (dragging) return "grabbing";
  if (toolMode === "pan") return "grab";
  if (toolMode === "rotate") return "crosshair";
  return "zoom-in";
}

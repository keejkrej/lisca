import type { AlignGridState } from "@lisca/contracts";
import {
  applyAlignGridPointerGesture,
  beginAlignGridPointerGesture,
  type AlignGridPointerGestureSession,
  type AlignGridToolMode,
  type AlignGridWheelViewport,
} from "@lisca/utils";
import { useRef, useState } from "react";

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
};

export function useAlignCanvasGridHandlers({
  disabled = false,
  grid,
  patternZoomLocked = false,
  setGrid,
  toolMode,
}: UseAlignCanvasGridHandlersOptions) {
  const gestureRef = useRef<AlignGridPointerGestureSession | null>(null);
  const previewGridRef = useRef<AlignGridState | null>(null);
  const [previewGrid, setPreviewGridState] = useState<AlignGridState | null>(null);
  const setPreviewGrid = (next: AlignGridState | null) => {
    previewGridRef.current = next;
    setPreviewGridState(next);
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
    setPreviewGrid(null);
  };
  const handlePointerMove = (event: AlignCanvasPointerEvent) => {
    const gesture = gestureRef.current;
    if (!gesture || !event.viewport || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    setPreviewGrid(applyAlignGridPointerGesture(gesture, event, event.viewport));
  };
  const handlePointerEnd = (event: AlignCanvasPointerEvent) => {
    if (gestureRef.current?.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    const committedPreviewGrid = previewGridRef.current;
    if (committedPreviewGrid) setGrid(committedPreviewGrid);
    setPreviewGrid(null);
    event.releasePointer();
  };
  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    previewGrid,
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

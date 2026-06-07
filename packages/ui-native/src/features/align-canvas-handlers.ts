"use client";

import type { AlignGridState } from "@lisca/contracts";
import {
  applyAlignGridPointerGesture,
  beginAlignGridPointerGesture,
  type AlignGridPointerGestureSession,
  type AlignGridToolMode,
} from "@lisca/utils";
import { useCallback, useRef, useState } from "react";

import type { AlignCanvasPointerEvent } from "./align-canvas.tsx";

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

  const setPreviewGrid = useCallback((next: AlignGridState | null) => {
    previewGridRef.current = next;
    setPreviewGridState(next);
  }, []);

  const handlePointerDown = useCallback(
    (event: AlignCanvasPointerEvent) => {
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
    },
    [disabled, grid, patternZoomLocked, setPreviewGrid, toolMode],
  );

  const handlePointerMove = useCallback(
    (event: AlignCanvasPointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || !event.viewport || gesture.pointerId !== event.pointerId) return;
      event.preventDefault();
      setPreviewGrid(applyAlignGridPointerGesture(gesture, event, event.viewport));
    },
    [setPreviewGrid],
  );

  const handlePointerEnd = useCallback(
    (event: AlignCanvasPointerEvent) => {
      if (gestureRef.current?.pointerId !== event.pointerId) return;
      gestureRef.current = null;
      const nextPreview = previewGridRef.current;
      if (nextPreview) setGrid(nextPreview);
      setPreviewGrid(null);
      event.releasePointer();
    },
    [setGrid, setPreviewGrid],
  );

  return { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid };
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

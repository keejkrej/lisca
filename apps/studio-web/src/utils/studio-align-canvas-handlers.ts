import type { AlignGridState } from "@lisca/contracts";
import type { AlignCanvasPointerEvent } from "@lisca/ui";
import {
  applyAlignGridPointerGesture,
  beginAlignGridPointerGesture,
  type AlignGridPointerGestureSession,
  type AlignGridToolMode,
} from "@lisca/utils";
import { useCallback, useRef, useState } from "react";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function useAlignCanvasHandlers(state: StudioAlignState) {
  const { grid, setGrid, toolMode } = state;
  const gestureRef = useRef<AlignGridPointerGestureSession | null>(null);
  const previewGridRef = useRef<AlignGridState | null>(null);
  const [previewGrid, setPreviewGridState] = useState<AlignGridState | null>(null);
  const setPreviewGrid = useCallback((next: AlignGridState | null) => {
    previewGridRef.current = next;
    setPreviewGridState(next);
  }, []);
  const handlePointerDown = useCallback(
    (event: AlignCanvasPointerEvent) => {
      if (!event.viewport || !grid.enabled) return;
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
    [grid, setPreviewGrid, toolMode],
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
      const previewGrid = previewGridRef.current;
      if (previewGrid) setGrid(previewGrid);
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

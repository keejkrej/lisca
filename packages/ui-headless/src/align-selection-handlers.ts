import type { AlignGridPatternCoord, AlignGridState } from "@lisca/contracts";
import {
  collectAlignGridStrokeTogglePatterns,
  findAlignGridPatternAtPoint,
  toggleExcludedAlignGridPatterns,
  type AlignGridFrameBounds,
} from "@lisca/utils";
import { createSignal, type Accessor } from "solid-js";

import type { AlignCanvasPointerEvent } from "./align-canvas-handlers";

type StrokeSession = {
  pointerId: number;
  startPoint: { x: number; y: number };
  toggledPatterns: AlignGridPatternCoord[];
};

export type UseAlignCanvasSelectionHandlersOptions = {
  disabled?: boolean;
  enabled?: boolean;
  frame: AlignGridFrameBounds | null;
  grid: AlignGridState;
  excludedPatterns: AlignGridPatternCoord[];
  onExcludedPatternsChange: (patterns: AlignGridPatternCoord[]) => void;
};

export function useAlignCanvasSelectionHandlers(
  options: () => UseAlignCanvasSelectionHandlersOptions,
) {
  const strokeRef = { current: null as StrokeSession | null };
  const excludedRef = { current: options().excludedPatterns };
  const [selecting, setSelecting] = createSignal(false);

  const applyStroke = (point: { x: number; y: number }) => {
    const session = strokeRef.current;
    const { frame, grid, onExcludedPatternsChange } = options();
    if (!session || !frame) return;
    const hitPatterns = collectAlignGridStrokeTogglePatterns(
      frame,
      grid,
      session.startPoint,
      point,
      session.toggledPatterns,
    );
    if (hitPatterns.length === 0) return;
    const next = toggleExcludedAlignGridPatterns(excludedRef.current, hitPatterns);
    excludedRef.current = next;
    onExcludedPatternsChange(next);
    session.toggledPatterns.push(...hitPatterns);
  };

  const handlePointerDown = (event: AlignCanvasPointerEvent): boolean => {
    const { disabled = false, enabled = false, frame, grid } = options();
    if (!enabled || disabled || !frame || !grid.enabled) return false;
    if (event.pointerType === "mouse" && event.button !== 0) return false;
    if (strokeRef.current) return false;
    excludedRef.current = options().excludedPatterns;
    event.preventDefault();
    if (!event.framePoint) return true;
    const pattern = findAlignGridPatternAtPoint(
      frame,
      grid,
      event.framePoint.x,
      event.framePoint.y,
    );
    if (!pattern) return true;
    event.capturePointer();
    strokeRef.current = {
      pointerId: event.pointerId,
      startPoint: event.framePoint,
      toggledPatterns: [],
    };
    setSelecting(true);
    applyStroke(event.framePoint);
    return true;
  };

  const handlePointerMove = (event: AlignCanvasPointerEvent): boolean => {
    const { enabled = false } = options();
    const session = strokeRef.current;
    if (!enabled || !session || session.pointerId !== event.pointerId || !event.framePoint) {
      return false;
    }
    event.preventDefault();
    applyStroke(event.framePoint);
    return true;
  };

  const endStroke = (event: AlignCanvasPointerEvent): boolean => {
    const session = strokeRef.current;
    if (!session || session.pointerId !== event.pointerId) return false;
    strokeRef.current = null;
    setSelecting(false);
    event.releasePointer();
    return true;
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd: endStroke,
    handlePointerCancel: endStroke,
    selecting: selecting as Accessor<boolean>,
  };
}

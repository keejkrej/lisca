import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import {
  collectAlignGridStrokeToggleCells,
  findAlignGridCellAtPoint,
  toggleExcludedAlignGridCells,
  type AlignGridFrameBounds,
} from "@lisca/utils";
import { useRef, useState } from "react";

import type { AlignCanvasPointerEvent } from "./align-canvas-handlers";

type StrokeSession = {
  pointerId: number;
  startPoint: { x: number; y: number };
  toggledCells: AlignGridCellCoord[];
};

export type UseAlignCanvasSelectionHandlersOptions = {
  disabled?: boolean;
  enabled?: boolean;
  frame: AlignGridFrameBounds | null;
  grid: AlignGridState;
  excludedCells: AlignGridCellCoord[];
  onExcludedCellsChange: (cells: AlignGridCellCoord[]) => void;
};

export function useAlignCanvasSelectionHandlers({
  disabled = false,
  enabled = false,
  excludedCells,
  frame,
  grid,
  onExcludedCellsChange,
}: UseAlignCanvasSelectionHandlersOptions) {
  const strokeRef = useRef<StrokeSession | null>(null);
  const excludedRef = useRef(excludedCells);
  excludedRef.current = excludedCells;
  const [selecting, setSelecting] = useState(false);

  const applyStroke = (point: { x: number; y: number }) => {
    const session = strokeRef.current;
    if (!session || !frame) return;
    const hitCells = collectAlignGridStrokeToggleCells(
      frame,
      grid,
      session.startPoint,
      point,
      session.toggledCells,
    );
    if (hitCells.length === 0) return;
    const next = toggleExcludedAlignGridCells(excludedRef.current, hitCells);
    excludedRef.current = next;
    onExcludedCellsChange(next);
    session.toggledCells.push(...hitCells);
  };

  const handlePointerDown = (event: AlignCanvasPointerEvent): boolean => {
    if (!enabled || disabled || !frame || !grid.enabled) return false;
    if (event.pointerType === "mouse" && event.button !== 0) return false;
    event.preventDefault();
    if (!event.framePoint) return true;
    const cell = findAlignGridCellAtPoint(frame, grid, event.framePoint.x, event.framePoint.y);
    if (!cell) return true;
    event.capturePointer();
    strokeRef.current = {
      pointerId: event.pointerId,
      startPoint: event.framePoint,
      toggledCells: [],
    };
    setSelecting(true);
    applyStroke(event.framePoint);
    return true;
  };

  const handlePointerMove = (event: AlignCanvasPointerEvent): boolean => {
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
    selecting,
  };
}

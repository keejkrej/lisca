import type { AlignGridCellCoord, AlignGridState } from "@lisca/contracts";
import type { AlignGridFrameBounds, AlignGridToolMode } from "@lisca/utils";
import { createMemo, type Accessor } from "solid-js";

import {
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  type AlignCanvasPointerEvent,
} from "./align-canvas-handlers";
import { useAlignCanvasSelectionHandlers } from "./align-selection-handlers";

export type UseAlignCanvasPointerHandlersOptions = {
  grid: AlignGridState;
  setGrid: (grid: AlignGridState) => void;
  toolMode: AlignGridToolMode;
  spacingZoomLocked?: boolean;
  patternZoomLocked?: boolean;
  disabled?: boolean;
  onPreviewGridChange?: () => void;
  manualExclusionEnabled: boolean;
  excludedCells: AlignGridCellCoord[];
  frame: AlignGridFrameBounds | null;
  onExcludedCellsChange: (cells: AlignGridCellCoord[]) => void;
};

export function useAlignCanvasPointerHandlers(options: () => UseAlignCanvasPointerHandlersOptions) {
  const previewRedrawRef = { current: null as (() => void) | null };
  const gridHandlers = useAlignCanvasGridHandlers(() => {
    const {
      disabled,
      grid,
      spacingZoomLocked,
      patternZoomLocked,
      setGrid,
      toolMode,
      onPreviewGridChange,
    } = options();
    return {
      disabled,
      grid,
      spacingZoomLocked,
      patternZoomLocked,
      setGrid,
      toolMode,
      onPreviewGridChange: () => {
        onPreviewGridChange?.();
        previewRedrawRef.current?.();
      },
    };
  });
  const selectionHandlers = useAlignCanvasSelectionHandlers(() => {
    const { disabled, manualExclusionEnabled, excludedCells, frame, grid, onExcludedCellsChange } =
      options();
    return {
      disabled,
      enabled: manualExclusionEnabled,
      excludedCells,
      frame,
      grid,
      onExcludedCellsChange,
    };
  });

  const handlePointerDown = (event: AlignCanvasPointerEvent) => {
    if (options().manualExclusionEnabled) {
      selectionHandlers.handlePointerDown(event);
      return;
    }
    gridHandlers.handlePointerDown(event);
  };
  const handlePointerMove = (event: AlignCanvasPointerEvent) => {
    if (selectionHandlers.handlePointerMove(event)) return;
    gridHandlers.handlePointerMove(event);
  };
  const handlePointerEnd = (event: AlignCanvasPointerEvent) => {
    if (selectionHandlers.handlePointerEnd(event)) return;
    gridHandlers.handlePointerEnd(event);
  };
  const handlePointerCancel = (event: AlignCanvasPointerEvent) => {
    if (selectionHandlers.handlePointerCancel(event)) return;
    gridHandlers.handlePointerCancel(event);
  };

  const cursor = createMemo(() => {
    const { toolMode, manualExclusionEnabled, grid } = options();
    if (toolMode === "magnifier") return "zoom-in";
    if (manualExclusionEnabled || selectionHandlers.selecting()) return "crosshair";
    return cursorForAlignTool(toolMode, grid.enabled, gridHandlers.dragging());
  });

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handlePointerCancel,
    previewGridRef: gridHandlers.previewGridRef,
    previewRedrawRef,
    dragging: gridHandlers.dragging,
    selecting: selectionHandlers.selecting,
    cursor: cursor as Accessor<string>,
  };
}

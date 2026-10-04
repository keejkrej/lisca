import type { AlignGridPatternCoord, AlignGridState } from "@lisca/contracts";
import type { AlignGridFrameBounds, AlignGridPointerIntent, AlignGridToolMode } from "@lisca/utils";
import { createMemo, type Accessor } from "solid-js";

import {
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  type AlignCanvasPointerEvent,
} from "./align-canvas-handlers";
import { useAlignCanvasSelectionHandlers } from "./align-selection-handlers";

export type UseAlignCanvasPointerHandlersOptions = {
  grid: AlignGridState;
  onCommit: (
    preview: AlignGridState,
    intent: AlignGridPointerIntent,
    startGrid: AlignGridState,
  ) => void;
  toolMode: AlignGridToolMode;
  spacingZoomLocked?: boolean;
  patternZoomLocked?: boolean;
  disabled?: boolean;
  onPreviewGridChange?: () => void;
  manualExclusionEnabled: boolean;
  excludedPatterns: AlignGridPatternCoord[];
  frame: AlignGridFrameBounds | null;
  onExcludedPatternsChange: (patterns: AlignGridPatternCoord[]) => void;
};

export function useAlignCanvasPointerHandlers(options: () => UseAlignCanvasPointerHandlersOptions) {
  const previewRedrawRef = { current: null as (() => void) | null };
  const gridHandlers = useAlignCanvasGridHandlers(() => {
    const {
      disabled,
      grid,
      spacingZoomLocked,
      patternZoomLocked,
      onCommit,
      toolMode,
      onPreviewGridChange,
    } = options();
    return {
      disabled,
      grid,
      spacingZoomLocked,
      patternZoomLocked,
      onCommit,
      toolMode,
      onPreviewGridChange: () => {
        onPreviewGridChange?.();
        previewRedrawRef.current?.();
      },
    };
  });
  const selectionHandlers = useAlignCanvasSelectionHandlers(() => {
    const {
      disabled,
      manualExclusionEnabled,
      excludedPatterns,
      frame,
      grid,
      onExcludedPatternsChange,
    } = options();
    return {
      disabled,
      enabled: manualExclusionEnabled,
      excludedPatterns,
      frame,
      grid,
      onExcludedPatternsChange,
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

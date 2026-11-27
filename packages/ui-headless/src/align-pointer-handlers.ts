import type { AlignGridPatternCoord, AlignGridState } from "@lisca/contracts";
import type { AlignGridFrameBounds, AlignGridPointerIntent, AlignGridToolMode } from "@lisca/utils";

import {
  createAlignCanvasGridHandlers,
  cursorForAlignTool,
  type AlignCanvasPointerEvent,
} from "./align-canvas-handlers";
import { createAlignCanvasSelectionHandlers } from "./align-selection-handlers";

export type AlignCanvasPointerHandlersOptions = {
  grid: AlignGridState;
  onCommit: (
    preview: AlignGridState,
    intent: AlignGridPointerIntent,
    startGrid: AlignGridState,
  ) => void;
  toolMode: AlignGridToolMode;
  spacingZoomLocked?: boolean | undefined;
  patternZoomLocked?: boolean | undefined;
  disabled?: boolean | undefined;
  onPreviewGridChange?: (() => void) | undefined;
  onDraggingChange?: ((dragging: boolean) => void) | undefined;
  onSelectingChange?: ((selecting: boolean) => void) | undefined;
  manualExclusionEnabled: boolean;
  excludedPatterns: AlignGridPatternCoord[];
  frame: AlignGridFrameBounds | null;
  onExcludedPatternsChange: (patterns: AlignGridPatternCoord[]) => void;
};

export type UseAlignCanvasPointerHandlersOptions = AlignCanvasPointerHandlersOptions;

export type AlignCanvasPointerHandlers = {
  handlePointerDown: (event: AlignCanvasPointerEvent) => void;
  handlePointerMove: (event: AlignCanvasPointerEvent) => void;
  handlePointerEnd: (event: AlignCanvasPointerEvent) => void;
  handlePointerCancel: (event: AlignCanvasPointerEvent) => void;
  previewGridRef: { current: AlignGridState | null };
  previewRedrawRef: { current: (() => void) | null };
  dragging: () => boolean;
  selecting: () => boolean;
  cursor: () => string;
};

export function createAlignCanvasPointerHandlers(
  options: () => AlignCanvasPointerHandlersOptions,
): AlignCanvasPointerHandlers {
  const previewRedrawRef = { current: null as (() => void) | null };
  const gridHandlers = createAlignCanvasGridHandlers(() => {
    const {
      disabled,
      grid,
      spacingZoomLocked,
      patternZoomLocked,
      onCommit,
      toolMode,
      onPreviewGridChange,
      onDraggingChange,
    } = options();
    return {
      disabled,
      grid,
      spacingZoomLocked,
      patternZoomLocked,
      onCommit,
      toolMode,
      onDraggingChange,
      onPreviewGridChange: () => {
        onPreviewGridChange?.();
        previewRedrawRef.current?.();
      },
    };
  });
  const selectionHandlers = createAlignCanvasSelectionHandlers(() => {
    const {
      disabled,
      manualExclusionEnabled,
      excludedPatterns,
      frame,
      grid,
      onExcludedPatternsChange,
      onSelectingChange,
    } = options();
    return {
      disabled,
      enabled: manualExclusionEnabled,
      excludedPatterns,
      frame,
      grid,
      onExcludedPatternsChange,
      onSelectingChange,
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

  const cursor = (): string => {
    const { toolMode, manualExclusionEnabled, grid } = options();
    if (toolMode === "magnifier") return "zoom-in";
    if (manualExclusionEnabled || selectionHandlers.selecting()) return "crosshair";
    return cursorForAlignTool(toolMode, grid.enabled, gridHandlers.dragging());
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handlePointerCancel,
    previewGridRef: gridHandlers.previewGridRef,
    previewRedrawRef,
    dragging: gridHandlers.dragging,
    selecting: selectionHandlers.selecting,
    cursor,
  };
}

export const useAlignCanvasPointerHandlers = createAlignCanvasPointerHandlers;

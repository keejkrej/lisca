import type { AlignGridCellCoord } from "@lisca/contracts";
import { formatSelectedAxisValueLabel } from "@lisca/utils";
import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useAlignCanvasSelectionHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import { createMemo } from "solid-js";

import { useStudioAlignCanvas, useStudioAlignNav } from "../state/studio-align-page-selectors";
import { StudioCropConfirmModal } from "./studio-crop-confirm-modal";
import { StudioCropStartModal } from "./studio-crop-start-modal";

function isSourceNotFoundError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("source not found") ||
    normalized.includes("no such file") ||
    normalized.includes("file error") ||
    normalized.includes("not a directory")
  );
}

function alignCanvasAlertText(error: string): string {
  return isSourceNotFoundError(error) ? "Source not found" : error;
}

export function StudioAlignMain() {
  const canvas = useStudioAlignCanvas();
  const nav = useStudioAlignNav();
  const previewRedrawRef = { current: null as (() => void) | null };
  const gridHandlers = useAlignCanvasGridHandlers(() => ({
    disabled: false,
    grid: canvas.grid,
    spacingZoomLocked: canvas.spacingZoomLocked,
    patternZoomLocked: canvas.patternZoomLocked,
    setGrid: canvas.setGrid,
    toolMode: canvas.toolMode,
    onPreviewGridChange: () => previewRedrawRef.current?.(),
  }));
  const selectionHandlers = useAlignCanvasSelectionHandlers(() => ({
    disabled: false,
    enabled: canvas.manualExclusionEnabled,
    excludedCells: canvas.currentExcludedCells,
    frame: canvas.frame,
    grid: canvas.grid,
    onExcludedCellsChange: (cells: AlignGridCellCoord[]) =>
      canvas.setExcludedCellsForCurrentPosition(cells),
  }));
  const handlePointerDown: typeof gridHandlers.handlePointerDown = (event) => {
    if (canvas.manualExclusionEnabled) {
      selectionHandlers.handlePointerDown(event);
      return;
    }
    if (selectionHandlers.handlePointerDown(event)) return;
    gridHandlers.handlePointerDown(event);
  };
  const handlePointerMove: typeof gridHandlers.handlePointerMove = (event) => {
    if (selectionHandlers.handlePointerMove(event)) return;
    gridHandlers.handlePointerMove(event);
  };
  const handlePointerEnd: typeof gridHandlers.handlePointerEnd = (event) => {
    if (selectionHandlers.handlePointerEnd(event)) return;
    gridHandlers.handlePointerEnd(event);
  };
  const handlePointerCancel: typeof gridHandlers.handlePointerCancel = (event) => {
    if (selectionHandlers.handlePointerCancel(event)) return;
    gridHandlers.handlePointerCancel(event);
  };
  const visibleStatus = useCanvasTransientStatus(() => canvas.status);
  const activeToastStatus = createMemo(() =>
    canvas.frameLoading
      ? "Loading frame"
      : canvas.scanLoading
        ? "Scanning source"
        : visibleStatus(),
  );
  const toasts = createMemo(() => {
    if (canvas.error) {
      return [
        {
          text: alignCanvasAlertText(canvas.error),
          tone: "error" as const,
        },
      ];
    }
    const status = activeToastStatus();
    if (status) {
      return [
        {
          text: status,
        },
      ];
    }
    return [];
  });
  const cursor = createMemo(() =>
    canvas.toolMode === "magnifier"
      ? "zoom-in"
      : canvas.manualExclusionEnabled || selectionHandlers.selecting()
        ? "crosshair"
        : cursorForAlignTool(canvas.toolMode, canvas.grid.enabled, gridHandlers.dragging()),
  );
  const positionLabel = createMemo(() => {
    const label = formatSelectedAxisValueLabel(nav.alignPositions, nav.selection.pos);
    return label || String(nav.selection.pos).padStart(2, "0");
  });

  return (
    <>
      <ViewportCard variant="stage">
        <StageCanvas
          aspect="wide"
          captionLeft={`Position ${positionLabel()}`}
          captionRight={
            canvas.frame ? `${canvas.frame.width} × ${canvas.frame.height} px` : "No frame"
          }
          class="max-w-[45rem]"
        >
          <AlignCanvas
            class="h-full w-full"
            cursor={cursor()}
            excludedCells={canvas.displayedExcludedCells}
            frame={canvas.frame}
            grid={canvas.grid}
            toolMode={canvas.toolMode}
            previewGridRef={gridHandlers.previewGridRef}
            previewRedrawRef={previewRedrawRef}
            toasts={toasts()}
            onVirtualPointerCancel={handlePointerCancel}
            onVirtualPointerDown={handlePointerDown}
            onVirtualPointerMove={handlePointerMove}
            onVirtualPointerUp={handlePointerEnd}
          />
        </StageCanvas>
      </ViewportCard>
      <StudioCropStartModal />
      <StudioCropConfirmModal />
    </>
  );
}

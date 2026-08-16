import type { AlignGridCellCoord } from "@lisca/contracts";
import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useAlignCanvasSelectionHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { createMemo } from "solid-js";

import { useAlignCanvas, useAlignNav } from "../state/align-page-selectors";

export function AlignerMain() {
  const canvas = useAlignCanvas();
  const nav = useAlignNav();
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
          text: canvas.error,
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
  const emptyText = createMemo(() =>
    !canvas.workspacePath
      ? "Pick a workspace."
      : !canvas.source
        ? "Pick a source."
        : canvas.scanLoading
          ? "Scanning source…"
          : "No frame loaded.",
  );
  const cursor = createMemo(() =>
    canvas.toolMode === "magnifier"
      ? "zoom-in"
      : canvas.manualExclusionEnabled || selectionHandlers.selecting()
        ? "crosshair"
        : cursorForAlignTool(canvas.toolMode, canvas.grid.enabled, gridHandlers.dragging()),
  );
  const positionLabel = createMemo(() => {
    const index = nav.scan?.positions.indexOf(nav.selection.pos) ?? -1;
    const explicit = index >= 0 ? nav.scan?.positionLabels?.[index] : undefined;
    return explicit?.trim() || String(nav.selection.pos).padStart(2, "0");
  });
  return (
    <>
      <ViewportCard variant="stage">
        <div class="flex h-full w-full max-w-[45rem] flex-col justify-center gap-3 self-center">
          <div class="aspect-[12/7] w-full overflow-hidden rounded-2xl bg-muted">
            <AlignCanvas
              class="h-full w-full"
              cursor={cursor()}
              emptyText={emptyText()}
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
          </div>
          <div class="flex items-center justify-between gap-4 px-1 text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
            <span>Position {positionLabel()}</span>
            <span>
              {canvas.frame ? `${canvas.frame.width} × ${canvas.frame.height} px` : "No frame"}
            </span>
          </div>
        </div>
      </ViewportCard>
    </>
  );
}

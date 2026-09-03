import type { AlignGridCellCoord } from "@lisca/contracts";
import {
  AlignCanvas,
  useAlignCanvasPointerHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import { createMemo } from "solid-js";

import { useAlignCanvas, useAlignNav } from "../state/align-page-selectors";

export function AlignerMain() {
  const canvas = useAlignCanvas();
  const nav = useAlignNav();
  const pointer = useAlignCanvasPointerHandlers(() => ({
    grid: canvas.grid,
    setGrid: canvas.setGrid,
    toolMode: canvas.toolMode,
    spacingZoomLocked: canvas.spacingZoomLocked,
    patternZoomLocked: canvas.patternZoomLocked,
    manualExclusionEnabled: canvas.manualExclusionEnabled,
    excludedCells: canvas.currentExcludedCells,
    frame: canvas.frame,
    onExcludedCellsChange: (cells: AlignGridCellCoord[]) =>
      canvas.setExcludedCellsForCurrentPosition(cells),
  }));
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
  const positionLabel = createMemo(() => {
    const index = nav.scan?.positions.indexOf(nav.selection.pos) ?? -1;
    const explicit = index >= 0 ? nav.scan?.positionLabels?.[index] : undefined;
    return explicit?.trim() || String(nav.selection.pos).padStart(2, "0");
  });
  return (
    <>
      <ViewportCard>
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
            cursor={pointer.cursor()}
            emptyText={emptyText()}
            excludedCells={canvas.displayedExcludedCells}
            frame={canvas.frame}
            grid={canvas.grid}
            toolMode={canvas.toolMode}
            previewGridRef={pointer.previewGridRef}
            previewRedrawRef={pointer.previewRedrawRef}
            toasts={toasts()}
            onVirtualPointerCancel={pointer.handlePointerCancel}
            onVirtualPointerDown={pointer.handlePointerDown}
            onVirtualPointerMove={pointer.handlePointerMove}
            onVirtualPointerUp={pointer.handlePointerEnd}
          />
        </StageCanvas>
      </ViewportCard>
    </>
  );
}

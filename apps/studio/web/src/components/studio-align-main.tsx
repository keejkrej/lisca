import type { AlignGridCellCoord } from "@lisca/contracts";
import { formatSelectedAxisValueLabel } from "@lisca/utils";
import {
  AlignCanvas,
  useAlignCanvasPointerHandlers,
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
            cursor={pointer.cursor()}
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
      <StudioCropStartModal />
      <StudioCropConfirmModal />
    </>
  );
}

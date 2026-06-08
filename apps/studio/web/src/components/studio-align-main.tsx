import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { useMemo } from "react";

import { StudioCropConfirmModal } from "./studio-crop-confirm-modal";
import { StudioCropProgressModal } from "./studio-crop-progress-modal";
import { StudioCropStartModal } from "./studio-crop-start-modal";
import { useStudioAlignCanvas, useStudioAlignCrop, useStudioAlignNav } from "../state/studio-align-page-selectors";

export function StudioAlignMain() {
  const canvas = useStudioAlignCanvas();
  const crop = useStudioAlignCrop();
  const nav = useStudioAlignNav();
  const { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid } =
    useAlignCanvasGridHandlers({
      grid: canvas.grid,
      patternZoomLocked: canvas.patternZoomLocked,
      setGrid: canvas.setGrid,
      toolMode: canvas.toolMode,
    });
  const visibleStatus = useCanvasTransientStatus(canvas.status);
  const activeToastStatus = crop.cropping
    ? "Cropping ROI output"
    : nav.saving || canvas.frameLoading
      ? "Loading frame"
      : canvas.scanLoading
        ? "Scanning source"
        : visibleStatus;
  const positionIndex = nav.alignPositions.indexOf(nav.selection.pos);
  const positionCount = nav.alignPositions.length;
  const positionMessage =
    positionIndex >= 0 && positionCount > 0 ? `Pos ${positionIndex}/${positionCount}` : null;
  const messages = useMemo(() => {
    if (!positionMessage) return [];
    return [{ text: positionMessage }];
  }, [positionMessage]);
  const toasts = useMemo(() => {
    if (canvas.error) return [{ text: canvas.error, tone: "error" as const }];
    if (activeToastStatus) return [{ text: activeToastStatus }];
    return [];
  }, [activeToastStatus, canvas.error]);
  return (
    <>
      <ViewportCard>
        <AlignCanvas
          className="min-h-0 flex-1"
          cursor={cursorForAlignTool(canvas.toolMode, canvas.grid.enabled, previewGrid != null)}
          excludedCells={canvas.displayedExcludedCells}
          frame={canvas.frame}
          grid={canvas.grid}
          loading={canvas.scanLoading || nav.saving || canvas.frameLoading || crop.cropping}
          messages={messages}
          previewGrid={previewGrid}
          toasts={toasts}
          onVirtualPointerCancel={handlePointerEnd}
          onVirtualPointerDown={handlePointerDown}
          onVirtualPointerMove={handlePointerMove}
          onVirtualPointerUp={handlePointerEnd}
        />
      </ViewportCard>
      <StudioCropStartModal />
      <StudioCropConfirmModal />
      <StudioCropProgressModal />
    </>
  );
}

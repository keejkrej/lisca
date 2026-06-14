import { useRef } from "react";
import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { StudioCropConfirmModal } from "./studio-crop-confirm-modal";
import { StudioCropProgressModal } from "./studio-crop-progress-modal";
import { StudioCropStartModal } from "./studio-crop-start-modal";
import {
  useStudioAlignCanvas,
  useStudioAlignCrop,
  useStudioAlignNav,
} from "../state/studio-align-page-selectors";
export function StudioAlignMain() {
  const canvas = useStudioAlignCanvas();
  const crop = useStudioAlignCrop();
  const nav = useStudioAlignNav();
  const previewRedrawRef = useRef<(() => void) | null>(null);
  const gridHandlers = useAlignCanvasGridHandlers({
    grid: canvas.grid,
    patternZoomLocked: canvas.patternZoomLocked,
    setGrid: canvas.setGrid,
    toolMode: canvas.toolMode,
    onPreviewGridChange: () => previewRedrawRef.current?.(),
  });
  const { handlePointerDown, handlePointerMove, handlePointerEnd } = gridHandlers;
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
  const messages = (() => {
    if (!positionMessage) return [];
    return [
      {
        text: positionMessage,
      },
    ];
  })();
  const toasts = (() => {
    if (canvas.error)
      return [
        {
          text: canvas.error,
          tone: "error" as const,
        },
      ];
    if (activeToastStatus)
      return [
        {
          text: activeToastStatus,
        },
      ];
    return [];
  })();
  return (
    <>
      <ViewportCard>
        <AlignCanvas
          className="min-h-0 flex-1"
          cursor={cursorForAlignTool(canvas.toolMode, canvas.grid.enabled, gridHandlers.dragging)}
          excludedCells={canvas.displayedExcludedCells}
          frame={canvas.frame}
          grid={canvas.grid}
          loading={canvas.scanLoading || nav.saving || canvas.frameLoading || crop.cropping}
          messages={messages}
          previewGridRef={gridHandlers.previewGridRef}
          previewRedrawRef={previewRedrawRef}
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

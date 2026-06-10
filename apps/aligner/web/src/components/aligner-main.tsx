import {
  AlignCanvas,
  CropProgressModal as SharedCropProgressModal,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { useAlignCanvas, useAlignCrop } from "../state/align-page-selectors";
import { CropConfirmModal } from "./crop-confirm-modal";
export function AlignerMain() {
  const canvas = useAlignCanvas();
  const crop = useAlignCrop();
  const { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid } =
    useAlignCanvasGridHandlers({
      disabled: crop.cropping,
      grid: canvas.grid,
      patternZoomLocked: canvas.patternZoomLocked,
      setGrid: canvas.setGrid,
      toolMode: canvas.toolMode,
    });
  const visibleStatus = useCanvasTransientStatus(canvas.status);
  const activeToastStatus = canvas.frameLoading
    ? "Loading frame"
    : canvas.scanLoading
      ? "Scanning source"
      : visibleStatus;
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
  const emptyText = !canvas.workspacePath
    ? "Pick a workspace."
    : !canvas.source
      ? "Pick a source."
      : canvas.scanLoading
        ? "Scanning source…"
        : "No frame loaded.";
  return (
    <>
      <ViewportCard>
        <AlignCanvas
          className="min-h-0 flex-1"
          cursor={cursorForAlignTool(canvas.toolMode, canvas.grid.enabled, previewGrid != null)}
          emptyText={emptyText}
          excludedCells={canvas.displayedExcludedCells}
          frame={canvas.frame}
          grid={canvas.grid}
          loading={canvas.scanLoading || canvas.frameLoading}
          previewGrid={previewGrid}
          toasts={toasts}
          onVirtualPointerCancel={handlePointerEnd}
          onVirtualPointerDown={handlePointerDown}
          onVirtualPointerMove={handlePointerMove}
          onVirtualPointerUp={handlePointerEnd}
        />
      </ViewportCard>
      <CropConfirmModal />
      <SharedCropProgressModal
        progress={crop.cropProgress}
        onCancel={() => void crop.cancelCrop()}
      />
    </>
  );
}

import { useRef } from "react";
import {
  AlignCanvas,
  CropProgressModal as SharedCropProgressModal,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useAlignCanvasSelectionHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { useAlignCanvas, useAlignCrop } from "../state/align-page-selectors";
import { CropConfirmModal } from "./crop-confirm-modal";

export function AlignerMain() {
  const canvas = useAlignCanvas();
  const crop = useAlignCrop();
  const previewRedrawRef = useRef<(() => void) | null>(null);
  const gridHandlers = useAlignCanvasGridHandlers({
    disabled: crop.cropping,
    grid: canvas.grid,
    patternZoomLocked: canvas.patternZoomLocked,
    setGrid: canvas.setGrid,
    toolMode: canvas.toolMode,
    onPreviewGridChange: () => previewRedrawRef.current?.(),
  });
  const selectionHandlers = useAlignCanvasSelectionHandlers({
    disabled: crop.cropping,
    enabled: canvas.manualExclusionEnabled,
    excludedCells: canvas.currentExcludedCells,
    frame: canvas.frame,
    grid: canvas.grid,
    onExcludedCellsChange: (cells) => canvas.setExcludedCellsForCurrentPosition(cells),
  });
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
  const handlePointerCancel: typeof gridHandlers.handlePointerEnd = (event) => {
    if (selectionHandlers.handlePointerCancel(event)) return;
    gridHandlers.handlePointerEnd(event);
  };
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
  const cursor = canvas.manualExclusionEnabled || selectionHandlers.selecting
    ? "crosshair"
    : cursorForAlignTool(canvas.toolMode, canvas.grid.enabled, gridHandlers.dragging);
  return (
    <>
      <ViewportCard>
        <AlignCanvas
          className="min-h-0 flex-1"
          cursor={cursor}
          emptyText={emptyText}
          excludedCells={canvas.displayedExcludedCells}
          frame={canvas.frame}
          grid={canvas.grid}
          loading={canvas.scanLoading || canvas.frameLoading}
          previewGridRef={gridHandlers.previewGridRef}
          previewRedrawRef={previewRedrawRef}
          toasts={toasts}
          onVirtualPointerCancel={handlePointerCancel}
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

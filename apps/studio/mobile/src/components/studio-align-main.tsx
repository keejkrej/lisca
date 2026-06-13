import {
  AlignCanvas,
  CropProgressModal,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
  ViewportCard,
} from "@lisca/ui-native";

import { useStudioAlignPage } from "../state/studio-align-page-context";
import { useStudioAlignCanvas, useStudioAlignCrop } from "../state/studio-align-page-selectors";
import { StudioCropConfirmModal, StudioCropStartModal } from "./studio-crop-modals";

export function StudioAlignMain() {
  const { state } = useStudioAlignPage();
  const canvas = useStudioAlignCanvas();
  const crop = useStudioAlignCrop();
  const { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid } =
    useAlignCanvasGridHandlers({
      disabled: canvas.cropping,
      grid: canvas.grid,
      patternZoomLocked: canvas.patternZoomLocked,
      setGrid: canvas.setGrid,
      toolMode: canvas.toolMode,
    });
  const visibleStatus = useCanvasTransientStatus(canvas.status);
  const activeToastStatus = canvas.cropping
    ? "Cropping ROI output"
    : canvas.saving || canvas.frameLoading
      ? "Loading frame"
      : canvas.scanLoading
        ? "Scanning source"
        : visibleStatus;
  const positionIndex = canvas.alignPositions.indexOf(canvas.selection.pos);
  const positionCount = canvas.alignPositions.length;
  const positionMessage =
    positionIndex >= 0 && positionCount > 0 ? `Pos ${positionIndex}/${positionCount}` : null;
  const messages = positionMessage ? [{ text: positionMessage }] : [];
  const toasts = canvas.error
    ? [{ text: canvas.error, tone: "error" as const }]
    : activeToastStatus
      ? [{ text: activeToastStatus }]
      : [];

  return (
    <>
      <ViewportCard>
        <AlignCanvas
          cursor={cursorForAlignTool(canvas.toolMode, canvas.grid.enabled, previewGrid != null)}
          excludedCells={canvas.displayedExcludedCells}
          frame={canvas.frame}
          grid={canvas.grid}
          loading={
            canvas.scanLoading || canvas.saving || canvas.frameLoading || canvas.cropping
          }
          messages={messages}
          previewGrid={previewGrid}
          toasts={toasts}
          onVirtualPointerCancel={handlePointerEnd}
          onVirtualPointerDown={handlePointerDown}
          onVirtualPointerMove={handlePointerMove}
          onVirtualPointerUp={handlePointerEnd}
        />
      </ViewportCard>
      <StudioCropStartModal state={state} />
      <StudioCropConfirmModal state={state} />
      <CropProgressModal progress={crop.cropProgress} onCancel={() => void state.cancelCrop()} />
    </>
  );
}

import { useRef } from "react";
import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
  ViewportCard,
} from "@lisca/ui-native";

import { useStudioAlignPage } from "../state/studio-align-page-context";
import { useStudioAlignCanvas } from "../state/studio-align-page-selectors";
import { StudioCropConfirmModal, StudioCropStartModal } from "./studio-crop-modals";
import { StudioCropProgressModal } from "./studio-crop-progress-modal";

export function StudioAlignMain() {
  const { state } = useStudioAlignPage();
  const canvas = useStudioAlignCanvas();
  const previewRedrawRef = useRef<(() => void) | null>(null);
  const gridHandlers = useAlignCanvasGridHandlers({
    disabled: canvas.cropping,
    grid: canvas.grid,
    patternZoomLocked: canvas.patternZoomLocked,
    setGrid: canvas.setGrid,
    toolMode: canvas.toolMode,
    onPreviewGridChange: () => previewRedrawRef.current?.(),
  });
  const { handlePointerDown, handlePointerMove, handlePointerEnd } = gridHandlers;
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
          cursor={cursorForAlignTool(canvas.toolMode, canvas.grid.enabled, gridHandlers.dragging)}
          excludedCells={canvas.displayedExcludedCells}
          frame={canvas.frame}
          grid={canvas.grid}
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
      <StudioCropStartModal state={state} />
      <StudioCropConfirmModal />
      <StudioCropProgressModal />
    </>
  );
}

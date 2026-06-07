import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
  ViewportCard,
} from "@lisca/ui";
import { useMemo } from "react";

import { StudioCropConfirmModal } from "./studio-crop-confirm-modal";
import { StudioCropProgressModal } from "./studio-crop-progress-modal";
import { StudioCropStartModal } from "./studio-crop-start-modal";
import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioAlignMain({ state }: { state: StudioAlignState }) {
  const { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid } =
    useAlignCanvasGridHandlers({
      grid: state.grid,
      patternZoomLocked: state.patternZoomLocked,
      setGrid: state.setGrid,
      toolMode: state.toolMode,
    });
  const visibleStatus = useCanvasTransientStatus(state.status);
  const activeToastStatus = state.cropping
    ? "Cropping ROI output"
    : state.saving || state.frameLoading
      ? "Loading frame"
      : state.scanLoading
        ? "Scanning source"
        : visibleStatus;
  const positionIndex = state.alignPositions.indexOf(state.selection.pos);
  const positionCount = state.alignPositions.length;
  const positionMessage =
    positionIndex >= 0 && positionCount > 0 ? `Pos ${positionIndex}/${positionCount}` : null;
  const messages = useMemo(() => {
    if (!positionMessage) return [];
    return [{ text: positionMessage }];
  }, [positionMessage]);
  const toasts = useMemo(() => {
    if (state.error) return [{ text: state.error, tone: "error" as const }];
    if (activeToastStatus) return [{ text: activeToastStatus }];
    return [];
  }, [activeToastStatus, state.error]);
  return (
    <>
      <ViewportCard>
        <AlignCanvas
          className="min-h-0 flex-1"
          cursor={cursorForAlignTool(state.toolMode, state.grid.enabled, previewGrid != null)}
          excludedCells={state.displayedExcludedCells}
          frame={state.frame}
          grid={state.grid}
          loading={state.scanLoading || state.saving || state.frameLoading || state.cropping}
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
      <StudioCropProgressModal state={state} />
    </>
  );
}

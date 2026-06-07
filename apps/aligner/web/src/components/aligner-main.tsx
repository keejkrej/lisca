import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { useMemo } from "react";

import { useAlignPage } from "../state/align-page-context";
import { CropConfirmModal } from "./crop-confirm-modal";
import { CropProgressModal } from "./crop-progress-modal";

export function AlignerMain() {
  const { state } = useAlignPage();
  const { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid } =
    useAlignCanvasGridHandlers({
      disabled: state.cropping,
      grid: state.grid,
      patternZoomLocked: state.patternZoomLocked,
      setGrid: state.setGrid,
      toolMode: state.toolMode,
    });
  const visibleStatus = useCanvasTransientStatus(state.status);
  const activeToastStatus = state.frameLoading
    ? "Loading frame"
    : state.scanLoading
      ? "Scanning source"
      : visibleStatus;
  const toasts = useMemo(() => {
    if (state.error) return [{ text: state.error, tone: "error" as const }];
    if (activeToastStatus) return [{ text: activeToastStatus }];
    return [];
  }, [activeToastStatus, state.error]);

  const emptyText = !state.workspacePath
    ? "Pick a workspace."
    : !state.source
      ? "Pick a source."
      : state.scanLoading
        ? "Scanning source..."
        : "No frame loaded.";

  return (
    <>
      <ViewportCard>
        <AlignCanvas
          className="min-h-0 flex-1"
          cursor={cursorForAlignTool(state.toolMode, state.grid.enabled, previewGrid != null)}
          emptyText={emptyText}
          excludedCells={state.displayedExcludedCells}
          frame={state.frame}
          grid={state.grid}
          loading={state.scanLoading || state.frameLoading}
          previewGrid={previewGrid}
          toasts={toasts}
          onVirtualPointerCancel={handlePointerEnd}
          onVirtualPointerDown={handlePointerDown}
          onVirtualPointerMove={handlePointerMove}
          onVirtualPointerUp={handlePointerEnd}
        />
      </ViewportCard>
      <CropConfirmModal />
      <CropProgressModal />
    </>
  );
}

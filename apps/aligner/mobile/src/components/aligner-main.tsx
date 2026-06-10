import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
  ViewportCard,
  CropProgressModal,
} from "@lisca/ui-native";
import type { AlignState } from "../state/use-align-state";
import { CropConfirmModal } from "./crop-confirm-modal";
export function AlignerMain({ state }: { state: AlignState }) {
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
  const toasts = (() => {
    if (state.error)
      return [
        {
          text: state.error,
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
      <CropConfirmModal state={state} />
      <CropProgressModal progress={state.cropProgress} onCancel={() => void state.cancelCrop()} />
    </>
  );
}

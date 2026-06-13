import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useAlignCanvasSelectionHandlers,
  useCanvasTransientStatus,
  ViewportCard,
  CropProgressModal,
} from "@lisca/ui-native";
import type { AlignState } from "../state/use-align-state";
import { CropConfirmModal } from "./crop-confirm-modal";

export function AlignerMain({ state }: { state: AlignState }) {
  const gridHandlers = useAlignCanvasGridHandlers({
    disabled: state.cropping,
    grid: state.grid,
    patternZoomLocked: state.patternZoomLocked,
    setGrid: state.setGrid,
    toolMode: state.toolMode,
  });
  const selectionHandlers = useAlignCanvasSelectionHandlers({
    disabled: state.cropping,
    enabled: state.manualExclusionEnabled,
    excludedCells: state.currentExcludedCells,
    frame: state.frame,
    grid: state.grid,
    onExcludedCellsChange: (cells) => state.setExcludedCellsForCurrentPosition(cells),
  });
  const handlePointerDown: typeof gridHandlers.handlePointerDown = (event) => {
    if (state.manualExclusionEnabled) {
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
        ? "Scanning source…"
        : "No frame loaded.";
  const cursor =
    state.manualExclusionEnabled || selectionHandlers.selecting
      ? "crosshair"
      : cursorForAlignTool(state.toolMode, state.grid.enabled, gridHandlers.previewGrid != null);

  return (
    <>
      <ViewportCard>
        <AlignCanvas
          cursor={cursor}
          emptyText={emptyText}
          excludedCells={state.displayedExcludedCells}
          frame={state.frame}
          grid={state.grid}
          loading={state.scanLoading || state.frameLoading}
          previewGrid={gridHandlers.previewGrid}
          toasts={toasts}
          onVirtualPointerCancel={handlePointerCancel}
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

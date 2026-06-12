import { ViewportCard } from "@lisca/ui/shell";
import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useAlignCanvasSelectionHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { frameWithContrast } from "@lisca/web-demo/browser";
import type { DemoAlignState } from "@lisca/web-demo";

export function DemoAlignMain({ state, embedded = false }: { state: DemoAlignState; embedded?: boolean }) {
  const gridHandlers = useAlignCanvasGridHandlers({
    disabled: false,
    grid: state.grid,
    patternZoomLocked: state.patternZoomLocked,
    setGrid: state.setGrid,
    toolMode: state.toolMode,
  });
  const selectionHandlers = useAlignCanvasSelectionHandlers({
    enabled: state.manualExclusionEnabled,
    excludedCells: state.excludedCells,
    frame: state.frame,
    grid: state.grid,
    onExcludedCellsChange: state.setExcludedCells,
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
  const displayFrame = state.frame ? frameWithContrast(state.frame, state.contrast) : null;
  const visibleStatus = useCanvasTransientStatus(state.status);
  const activeToastStatus = state.frameLoading ? "Loading image" : visibleStatus;
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
  const cursor =
    state.manualExclusionEnabled || selectionHandlers.selecting
      ? "crosshair"
      : cursorForAlignTool(state.toolMode, state.grid.enabled, gridHandlers.previewGrid != null);
  return (
    <ViewportCard>
      <AlignCanvas
        className="min-h-0 flex-1"
        cursor={cursor}
        excludedCells={state.excludedCells}
        frame={displayFrame}
        grid={state.grid}
        loading={state.frameLoading}
        previewGrid={gridHandlers.previewGrid}
        toasts={embedded ? [] : toasts}
        onVirtualPointerCancel={handlePointerCancel}
        onVirtualPointerDown={handlePointerDown}
        onVirtualPointerMove={handlePointerMove}
        onVirtualPointerUp={handlePointerEnd}
      />
    </ViewportCard>
  );
}

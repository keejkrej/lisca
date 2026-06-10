import { ViewportCard } from "@lisca/ui/shell";
import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { frameWithContrast } from "@lisca/web-demo/browser";
import type { DemoAlignState } from "../state/use-demo-align-state";
export function DemoAlignMain({ state }: { state: DemoAlignState }) {
  const { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid } =
    useAlignCanvasGridHandlers({
      disabled: false,
      grid: state.grid,
      patternZoomLocked: state.patternZoomLocked,
      setGrid: state.setGrid,
      toolMode: state.toolMode,
    });
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
  return (
    <ViewportCard>
      <AlignCanvas
        className="min-h-0 flex-1"
        cursor={cursorForAlignTool(state.toolMode, state.grid.enabled, previewGrid != null)}
        emptyText={state.frame ? "No frame loaded." : "Open an image to begin."}
        excludedCells={state.excludedCells}
        frame={displayFrame}
        grid={state.grid}
        loading={state.frameLoading}
        previewGrid={previewGrid}
        toasts={toasts}
        onVirtualPointerCancel={handlePointerEnd}
        onVirtualPointerDown={handlePointerDown}
        onVirtualPointerMove={handlePointerMove}
        onVirtualPointerUp={handlePointerEnd}
      />
    </ViewportCard>
  );
}

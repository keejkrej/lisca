import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useCanvasTransientStatus,
  ViewportCard,
} from "@lisca/ui";
import { frameWithContrast } from "@lisca/browser-frame";
import { useMemo } from "react";

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
  const displayFrame = useMemo(
    () => (state.frame ? frameWithContrast(state.frame, state.contrast) : null),
    [state.contrast, state.frame],
  );
  const visibleStatus = useCanvasTransientStatus(state.status);
  const activeToastStatus = state.frameLoading ? "Loading image" : visibleStatus;
  const toasts = useMemo(() => {
    if (state.error) return [{ text: state.error, tone: "error" as const }];
    if (activeToastStatus) return [{ text: activeToastStatus }];
    return [];
  }, [activeToastStatus, state.error]);

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

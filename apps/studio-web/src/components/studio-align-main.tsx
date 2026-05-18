import { AlignCanvasSurface, useCanvasTransientStatus } from "@lisca/ui";
import { useMemo } from "react";

import type { StudioAlignState } from "../state/use-studio-align-state";
import { cursorForAlignTool, useAlignCanvasHandlers } from "../utils/studio-align-canvas-handlers";

export function StudioAlignMain({ state }: { state: StudioAlignState }) {
  const { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid } =
    useAlignCanvasHandlers(state);
  const visibleStatus = useCanvasTransientStatus(state.status);
  const activeToastStatus = state.frameLoading
    ? "Loading frame"
    : state.scanLoading
      ? "Scanning source"
      : visibleStatus;
  const positionIndex = state.scan?.positions.indexOf(state.selection.pos) ?? -1;
  const positionCount = state.scan?.positions.length ?? 0;
  const positionMessage =
    positionIndex >= 0 && positionCount > 0 ? `Pos ${positionIndex + 1}/${positionCount}` : null;
  const messages = useMemo(() => {
    if (!positionMessage) return [];
    return [{ text: positionMessage }];
  }, [positionMessage]);
  const toasts = useMemo(() => {
    if (state.error) return [{ text: state.error, tone: "error" as const }];
    if (activeToastStatus) return [{ text: activeToastStatus }];
    return [];
  }, [activeToastStatus, state.error]);
  const emptyText = !state.workspacePath
    ? "Choose a save folder on Info."
    : !state.source
      ? "Choose a data source on Info."
      : state.scanLoading
        ? "Scanning source..."
        : "No frame loaded.";

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <AlignCanvasSurface
        className="min-h-0 flex-1"
        cursor={cursorForAlignTool(state.toolMode, state.grid.enabled, previewGrid != null)}
        emptyText={emptyText}
        excludedCells={state.currentExcludedCells}
        frame={state.frame}
        grid={state.grid}
        loading={state.scanLoading || state.frameLoading}
        messages={messages}
        previewGrid={previewGrid}
        toasts={toasts}
        onVirtualPointerCancel={handlePointerEnd}
        onVirtualPointerDown={handlePointerDown}
        onVirtualPointerMove={handlePointerMove}
        onVirtualPointerUp={handlePointerEnd}
      />
    </div>
  );
}

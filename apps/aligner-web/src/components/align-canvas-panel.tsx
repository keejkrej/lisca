import { AlignCanvasSurface, useCanvasTransientStatus } from "@lisca/ui";
import { useMemo } from "react";

import type { AlignState } from "../state/use-align-state";
import { cursorForAlignTool, useAlignCanvasHandlers } from "../utils/align-canvas-handlers";
import { CropConfirmModal } from "./crop-confirm-modal";
import { CropProgressModal } from "./crop-progress-modal";

export function AlignCanvasPanel({ state }: { state: AlignState }) {
  const { handlePointerDown, handlePointerMove, handlePointerEnd, previewGrid } =
    useAlignCanvasHandlers(state);
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
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <AlignCanvasSurface
        className="min-h-0 flex-1"
        cursor={cursorForAlignTool(state.toolMode, state.grid.enabled, previewGrid != null)}
        emptyText={emptyText}
        excludedCells={state.currentExcludedCells}
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
      <CropConfirmModal state={state} />
      <CropProgressModal state={state} />
    </div>
  );
}

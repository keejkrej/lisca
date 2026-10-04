import type { AlignGridPatternCoord } from "@lisca/contracts";
import {
  AlignCanvas,
  CanvasToastStack,
  useAlignCanvasPointerHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import { createMemo } from "solid-js";

import { useAlignCanvas, useAlignNav } from "../state/align-page-selectors";

export function AlignerMain() {
  const canvas = useAlignCanvas();
  const nav = useAlignNav();
  const pointer = useAlignCanvasPointerHandlers(() => ({
    grid: canvas.effectiveGrid,
    onCommit: canvas.commitCanvas,
    toolMode: canvas.toolMode,
    spacingZoomLocked: canvas.spacingZoomLocked,
    patternZoomLocked: canvas.patternZoomLocked,
    manualExclusionEnabled: canvas.manualExclusionEnabled,
    excludedPatterns: canvas.currentExcludedPatterns,
    frame: canvas.frame,
    onExcludedPatternsChange: (patterns: AlignGridPatternCoord[]) =>
      canvas.setExcludedPatternsForCurrentPosition(patterns),
  }));
  const visibleStatus = useCanvasTransientStatus(() => canvas.status);
  const activeToastStatus = createMemo(() =>
    canvas.frameLoading
      ? "Loading frame"
      : canvas.scanLoading
        ? "Scanning source"
        : visibleStatus(),
  );
  const toasts = createMemo(() => {
    if (canvas.error) {
      return [
        {
          text: canvas.error,
          tone: "error" as const,
        },
      ];
    }
    const status = activeToastStatus();
    if (status) {
      return [
        {
          text: status,
        },
      ];
    }
    return [];
  });
  const emptyText = createMemo(() =>
    !canvas.workspacePath
      ? "Pick a workspace."
      : !canvas.source
        ? "Pick a source."
        : canvas.scanLoading
          ? "Scanning source…"
          : "No frame loaded.",
  );
  const positionLabel = createMemo(() => {
    const index = nav.scan?.positions.indexOf(nav.selection.pos) ?? -1;
    const explicit = index >= 0 ? nav.scan?.positionLabels?.[index] : undefined;
    return explicit?.trim() || String(nav.selection.pos).padStart(2, "0");
  });
  return (
    <>
      <ViewportCard>
        <StageCanvas
          notice={<CanvasToastStack messages={toasts()} />}
          captionLeft={`Position ${positionLabel()}`}
          captionRight={
            canvas.frame ? `${canvas.frame.width} × ${canvas.frame.height} px` : "No frame"
          }
        >
          <AlignCanvas
            class="h-full w-full"
            cursor={pointer.cursor()}
            emptyText={emptyText()}
            excludedPatterns={canvas.displayedExcludedPatterns}
            frame={canvas.frame}
            grid={canvas.effectiveGrid}
            toolMode={canvas.toolMode}
            previewGridRef={pointer.previewGridRef}
            previewRedrawRef={pointer.previewRedrawRef}
            onVirtualPointerCancel={pointer.handlePointerCancel}
            onVirtualPointerDown={pointer.handlePointerDown}
            onVirtualPointerMove={pointer.handlePointerMove}
            onVirtualPointerUp={pointer.handlePointerEnd}
          />
        </StageCanvas>
      </ViewportCard>
    </>
  );
}

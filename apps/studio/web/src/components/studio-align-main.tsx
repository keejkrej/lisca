import type { AlignGridPatternCoord } from "@lisca/contracts";
import { formatSelectedAxisValueLabel } from "@lisca/utils";
import {
  AlignCanvas,
  CanvasToastStack,
  useAlignCanvasPointerHandlers,
  useCanvasTransientStatus,
} from "@lisca/instrument";
import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import { createMemo, Show } from "solid-js";

import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { useStudioAlignPage } from "../state/studio-align-page-context";
import { useStudioAlignCanvas, useStudioAlignNav } from "../state/studio-align-page-selectors";
import type { AlignPositionSaveState } from "../state/use-studio-align-state";
import { StudioAlignUnsavedChangesModal } from "./studio-align-unsaved-changes-modal";
import { StudioCropConfirmModal } from "./studio-crop-confirm-modal";
import { StudioCropStartModal } from "./studio-crop-start-modal";
import {
  alignStagePlaceholder,
  StudioStagePlaceholderView,
  studioStagePlaceholderRoute,
} from "./studio-stage-placeholder";

const SAVE_STATE_LABEL: Record<AlignPositionSaveState, string> = {
  saved: "Saved",
  unsaved: "Not saved",
  changed: "Unsaved changes",
};

export function StudioAlignMain() {
  const { navigateTo } = useStudioNavigate();
  const canvas = useStudioAlignCanvas();
  const nav = useStudioAlignNav();
  const pointer = useAlignCanvasPointerHandlers(() => ({
    grid: canvas.grid,
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
  const { state } = useStudioAlignPage();
  const placeholder = () =>
    alignStagePlaceholder({
      workspacePath: state.workspacePath,
      hasSource: state.source != null,
      scanLoading: state.scanLoading,
      hasScan: state.scan != null,
      alignPositionCount: state.alignPositions.length,
      error: state.error,
    });
  const positionLabel = createMemo(() => {
    const label = formatSelectedAxisValueLabel(nav.alignPositions, nav.selection.pos);
    return label || String(nav.selection.pos).padStart(2, "0");
  });

  return (
    <>
      <Show
        when={placeholder()}
        fallback={
          <ViewportCard>
            <StageCanvas
              notice={<CanvasToastStack messages={toasts()} />}
              captionLeft={`Position ${positionLabel()} · ${SAVE_STATE_LABEL[state.positionSaveState]}`}
              captionRight={
                canvas.frame ? `${canvas.frame.width} × ${canvas.frame.height} px` : "No frame"
              }
            >
              <AlignCanvas
                class="h-full w-full"
                cursor={pointer.cursor()}
                excludedPatterns={canvas.displayedExcludedPatterns}
                frame={canvas.frame}
                grid={canvas.grid}
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
        }
      >
        {(item) => (
          <StudioStagePlaceholderView
            actionLabel={item().actionLabel}
            description={item().description}
            title={item().title}
            onAction={() => {
              const action = item().action;
              if (action) navigateTo(studioStagePlaceholderRoute(action));
            }}
          />
        )}
      </Show>
      <StudioAlignUnsavedChangesModal />
      <StudioCropStartModal />
      <StudioCropConfirmModal />
    </>
  );
}

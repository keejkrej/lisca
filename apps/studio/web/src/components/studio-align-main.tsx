import type { AlignGridCellCoord } from "@lisca/contracts";
import { formatSelectedAxisValueLabel } from "@lisca/utils";
import {
  AlignCanvas,
  CanvasStatusMessageStack,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useAlignCanvasSelectionHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { FrameAspectPanel } from "@lisca/ui/shell";
import { createMemo, Show } from "solid-js";

import {
  useStudioAlignCanvas,
  useStudioAlignCrop,
  useStudioAlignNav,
} from "../state/studio-align-page-selectors";
import { StudioCropConfirmModal } from "./studio-crop-confirm-modal";
import { StudioCropProgressModal } from "./studio-crop-progress-modal";
import { StudioCropStartModal } from "./studio-crop-start-modal";

function isSourceNotFoundError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("source not found") ||
    normalized.includes("no such file") ||
    normalized.includes("file error") ||
    normalized.includes("not a directory")
  );
}

function alignCanvasAlertText(error: string): string {
  return isSourceNotFoundError(error) ? "Source not found" : error;
}

export function StudioAlignMain() {
  const canvas = useStudioAlignCanvas();
  const crop = useStudioAlignCrop();
  const nav = useStudioAlignNav();
  const previewRedrawRef = { current: null as (() => void) | null };
  const gridHandlers = useAlignCanvasGridHandlers(() => ({
    disabled: crop.cropping,
    grid: canvas.grid,
    patternZoomLocked: canvas.patternZoomLocked,
    setGrid: canvas.setGrid,
    toolMode: canvas.toolMode,
    onPreviewGridChange: () => previewRedrawRef.current?.(),
  }));
  const selectionHandlers = useAlignCanvasSelectionHandlers(() => ({
    disabled: crop.cropping,
    enabled: canvas.manualExclusionEnabled,
    excludedCells: canvas.currentExcludedCells,
    frame: canvas.frame,
    grid: canvas.grid,
    onExcludedCellsChange: (cells: AlignGridCellCoord[]) =>
      canvas.setExcludedCellsForCurrentPosition(cells),
  }));
  const handlePointerDown: typeof gridHandlers.handlePointerDown = (event) => {
    if (canvas.manualExclusionEnabled) {
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
  const visibleStatus = useCanvasTransientStatus(() => canvas.status);
  const operationalStatus = createMemo(() => {
    if (crop.cropping) return "Cropping ROI output";
    if (canvas.frameLoading) return "Loading frame";
    if (canvas.scanLoading) return "Scanning source";
    return null;
  });
  const isOperationalStatus = (text: string) => /loading|scanning|cropping/i.test(text);
  const positionInfo = createMemo(() => {
    const positionLabel = formatSelectedAxisValueLabel(nav.alignPositions, nav.selection.pos);
    const positionMessage = positionLabel ? `Pos ${positionLabel}` : null;
    return positionMessage
      ? [
          {
            text: positionMessage,
          },
        ]
      : [];
  });
  const canvasAlerts = createMemo(() => {
    const error = canvas.error;
    if (!error) return [];
    return [
      {
        text: alignCanvasAlertText(error),
        tone: "error" as const,
      },
    ];
  });
  const statusMessages = createMemo(() => {
    if (canvas.error) return [];
    const status = visibleStatus();
    if (!status || isOperationalStatus(status)) return [];
    return [{ text: status }];
  });
  const operationalMessages = createMemo(() => {
    const status = operationalStatus();
    if (!status) return [];
    return [{ text: status }];
  });
  const cursor = createMemo(() =>
    canvas.manualExclusionEnabled || selectionHandlers.selecting()
      ? "crosshair"
      : cursorForAlignTool(canvas.toolMode, canvas.grid.enabled, gridHandlers.dragging()),
  );

  return (
    <>
      <div class="flex h-full min-h-0 flex-1 flex-col gap-2 bg-background p-3">
        <Show
          when={
            positionInfo().length > 0 ||
            statusMessages().length > 0 ||
            operationalMessages().length > 0 ||
            canvasAlerts().length > 0
          }
        >
          <div class="flex shrink-0 items-start justify-between gap-2">
            <div class="flex min-w-0 flex-wrap items-start gap-1.5">
              <CanvasStatusMessageStack layout="inline" messages={positionInfo()} />
              <CanvasStatusMessageStack layout="inline" messages={statusMessages()} />
            </div>
            <div class="flex min-w-0 flex-wrap items-start justify-end gap-1.5">
              <CanvasStatusMessageStack
                align="right"
                layout="inline"
                messages={operationalMessages()}
              />
              <CanvasStatusMessageStack align="right" layout="inline" messages={canvasAlerts()} />
            </div>
          </div>
        </Show>
        <FrameAspectPanel frame={canvas.frame}>
          <AlignCanvas
            class="h-full w-full"
            cursor={cursor()}
            excludedCells={canvas.displayedExcludedCells}
            frame={canvas.frame}
            grid={canvas.grid}
            previewGridRef={gridHandlers.previewGridRef}
            previewRedrawRef={previewRedrawRef}
            onVirtualPointerCancel={handlePointerCancel}
            onVirtualPointerDown={handlePointerDown}
            onVirtualPointerMove={handlePointerMove}
            onVirtualPointerUp={handlePointerEnd}
          />
        </FrameAspectPanel>
      </div>
      <StudioCropStartModal />
      <StudioCropConfirmModal />
      <StudioCropProgressModal />
    </>
  );
}

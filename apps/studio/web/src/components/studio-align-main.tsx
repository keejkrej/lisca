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

import { useStudioAlignCanvas, useStudioAlignNav } from "../state/studio-align-page-selectors";
import { StudioCropConfirmModal } from "./studio-crop-confirm-modal";
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
  const nav = useStudioAlignNav();
  const previewRedrawRef = { current: null as (() => void) | null };
  const gridHandlers = useAlignCanvasGridHandlers(() => ({
    disabled: false,
    grid: canvas.grid,
    spacingZoomLocked: canvas.spacingZoomLocked,
    patternZoomLocked: canvas.patternZoomLocked,
    setGrid: canvas.setGrid,
    toolMode: canvas.toolMode,
    onPreviewGridChange: () => previewRedrawRef.current?.(),
  }));
  const selectionHandlers = useAlignCanvasSelectionHandlers(() => ({
    disabled: false,
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
  const handlePointerCancel: typeof gridHandlers.handlePointerCancel = (event) => {
    if (selectionHandlers.handlePointerCancel(event)) return;
    gridHandlers.handlePointerCancel(event);
  };
  const visibleStatus = useCanvasTransientStatus(() => canvas.status);
  const operationalStatus = createMemo(() => {
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
    canvas.toolMode === "magnifier"
      ? "zoom-in"
      : canvas.manualExclusionEnabled || selectionHandlers.selecting()
        ? "crosshair"
        : cursorForAlignTool(canvas.toolMode, canvas.grid.enabled, gridHandlers.dragging()),
  );

  return (
    <>
      <div class="relative flex h-full min-h-0 flex-1 items-center justify-center bg-background p-6">
        <Show
          when={
            positionInfo().length > 0 ||
            statusMessages().length > 0 ||
            operationalMessages().length > 0 ||
            canvasAlerts().length > 0
          }
        >
          <div class="absolute inset-x-3 top-3 z-10 flex shrink-0 items-start justify-between gap-2">
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
        <div class="flex h-full max-h-[420px] w-full max-w-[720px] min-h-0 min-w-0">
          <FrameAspectPanel
            class="rounded-none border-0 bg-transparent shadow-none"
            frame={canvas.frame}
          >
            <AlignCanvas
              class="h-full w-full"
              cursor={cursor()}
              excludedCells={canvas.displayedExcludedCells}
              frame={canvas.frame}
              grid={canvas.grid}
              toolMode={canvas.toolMode}
              previewGridRef={gridHandlers.previewGridRef}
              previewRedrawRef={previewRedrawRef}
              onVirtualPointerCancel={handlePointerCancel}
              onVirtualPointerDown={handlePointerDown}
              onVirtualPointerMove={handlePointerMove}
              onVirtualPointerUp={handlePointerEnd}
            />
          </FrameAspectPanel>
        </div>
      </div>
      <StudioCropStartModal />
      <StudioCropConfirmModal />
    </>
  );
}

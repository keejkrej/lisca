import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { ViewerDataPort } from "lisca/viewer/contracts";
import {
  applyGridPointerGesture,
  applyGridWheelGesture,
  beginGridPointerGesture,
  buildBboxCsv,
  coerceSelection,
  collectEdgeCells,
  enumerateVisibleGridCells,
  type GridPointerGestureSession,
  type GridState,
} from "lisca/viewer/core";
import { showErrorToast, showSuccessToast } from "lisca/shared/react";
import {
  queryKeys,
  useAlignStateQuery,
  useSaveBboxMutation,
  useScanSourceQuery,
} from "lisca/shared/query";

import { ViewerCanvasSurface } from "../../alignment";
import type { ViewerCanvasPointerEvent, ViewerCanvasWheelEvent } from "../../alignment/types";
import {
  excludeCells,
  patchViewState,
  setGrid,
  setSaving,
  setTimeSliderIndex,
  viewerStore,
} from "../viewerStore";
import { toErrorMessage } from "../viewerEffects";
import { useSyncAlignStateQueryToViewerStore, useSyncScanSourceQueryToStudioAlignStore } from "../../hooks/syncQueryToViewerStore";
import { useViewerSourceFrameLoad } from "../../hooks/useViewerSourceFrameLoad";
import { advanceStudioAlignSelection } from "./advanceSelection";
import { inferViewerSourceFromDataPath } from "./inferSource";

function cellKey(i: number, j: number): string {
  return `${i}:${j}`;
}

export interface StudioAlignPatternProps {
  /** Null when not running inside Tauri (plain Vite web). */
  dataPort: ViewerDataPort | null;
  dataPath: string;
  saveTo: string;
  /** Registers the align-step "next" commit handler for the Studio command bar. */
  onRegisterCommit: (handler: (() => Promise<void>) | null) => void;
}

export default function StudioAlignPattern({
  dataPort,
  dataPath,
  saveTo,
  onRegisterCommit,
}: StudioAlignPatternProps) {
  const backend = dataPort;
  const dragSessionRef = useRef<GridPointerGestureSession | null>(null);
  const [previewGrid, setPreviewGrid] = useState<GridState | null>(null);

  const {
    scan,
    selection,
    grid,
    frame,
    loading,
    error,
    contrastMin,
    contrastMax,
    contrastMode,
    excludedCellsByPosition,
    workspacePath,
    source,
  } = useStore(
    viewerStore,
    useShallow((state) => ({
      scan: state.scan,
      selection: state.selection,
      grid: state.grid,
      frame: state.frame,
      loading: state.loading,
      error: state.error,
      contrastMin: state.contrastMin,
      contrastMax: state.contrastMax,
      contrastMode: state.contrastMode,
      excludedCellsByPosition: state.excludedCellsByPosition,
      workspacePath: state.workspacePath,
      source: state.source,
    })),
  );

  const selectedPos = selection?.pos ?? null;

  const workspaceTrim = saveTo.trim();
  const sourceInferred = useMemo(() => inferViewerSourceFromDataPath(dataPath), [dataPath]);

  const queryClient = useQueryClient();
  const saveBboxMutation = useSaveBboxMutation(backend as ViewerDataPort);
  const scanSourceQuery = useScanSourceQuery(backend as ViewerDataPort, sourceInferred, {
    enabled: Boolean(backend && workspaceTrim && sourceInferred),
  });
  const alignQuery = useAlignStateQuery(backend as ViewerDataPort, workspacePath, selectedPos, {
    enabled: Boolean(backend && workspacePath && selectedPos != null),
  });

  useSyncScanSourceQueryToStudioAlignStore(
    Boolean(backend && workspaceTrim && sourceInferred),
    workspaceTrim,
    sourceInferred,
    scanSourceQuery,
  );

  const enableAlignGrid = useCallback(() => {
    setGrid((g) => ({ ...g, enabled: true }));
  }, []);

  useSyncAlignStateQueryToViewerStore(selectedPos, workspacePath, alignQuery, enableAlignGrid);

  const reloadToken = useStore(viewerStore, (s) => s.contrastReloadToken);
  const contrastKey =
    contrastMode === "auto" ? `auto:${reloadToken}` : `${contrastMin}:${contrastMax}`;

  useViewerSourceFrameLoad({
    backend,
    source,
    selection,
    contrastMode,
    contrastMin,
    contrastMax,
    contrastRequestKey: contrastKey,
  });

  useEffect(() => {
    if (!error) return;
    showErrorToast(error);
  }, [error]);

  const currentPositionExcludedCells = useMemo(
    () => (selection ? excludedCellsByPosition[selection.pos] ?? [] : []),
    [excludedCellsByPosition, selection],
  );

  const renderedExcludedCells = currentPositionExcludedCells;

  const emptyText = useMemo(() => {
    if (!backend) {
      return "Open Studio with Tauri (desktop) to load microscopy data.";
    }
    if (!workspaceTrim || !sourceInferred) {
      return "Set Data path and Save to in Basic info.";
    }
    if (scan && scan.positions.length === 0) {
      return "No frames found for this source.";
    }
    return "No frame loaded.";
  }, [backend, scan, sourceInferred, workspaceTrim]);

  const canvasCursor = grid.enabled ? (previewGrid ? "grabbing" : "grab") : "default";

  const handleCanvasPointerDown = useCallback(
    (event: ViewerCanvasPointerEvent) => {
      if (!grid.enabled) return;
      const session = beginGridPointerGesture(grid, event);
      if (!session) return;
      dragSessionRef.current = session;
      event.capturePointer();
      event.preventDefault();
    },
    [grid],
  );

  const handleCanvasPointerMove = useCallback(
    (event: ViewerCanvasPointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId || !event.viewport) return;
      setPreviewGrid(applyGridPointerGesture(session, event, event.viewport));
      event.preventDefault();
    },
    [],
  );

  const handleCanvasPointerEnd = useCallback(
    (event: ViewerCanvasPointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      dragSessionRef.current = null;
      if (previewGrid) {
        setGrid(previewGrid);
      }
      setPreviewGrid(null);
      event.releasePointer();
    },
    [previewGrid],
  );

  const handleCanvasWheel = useCallback(
    (event: ViewerCanvasWheelEvent) => {
      if (!frame || !grid.enabled || !event.viewport) return;
      event.preventDefault();
      dragSessionRef.current = null;
      setPreviewGrid(null);
      setGrid((current) => applyGridWheelGesture(current, event, event.viewport!));
    },
    [frame, grid.enabled],
  );

  const commitAndAdvance = useCallback(async () => {
    if (!backend) return;

    const {
      workspacePath: ws,
      source: src,
      selection: sel,
      frame: fr,
      grid: gr,
      scan: sc,
    } = viewerStore.getState();

    if (!ws || !src || !sel || !fr || !sc || sc.positions.length === 0) {
      showErrorToast("Cannot save: missing workspace, frame, or scan.");
      return;
    }

    setSaving(true);

    const edgeCells = collectEdgeCells(fr, gr);
    if (edgeCells.length > 0) {
      excludeCells(sel.pos, edgeCells);
    }

    const excludedAfterEdge = viewerStore.getState().excludedCellsByPosition[sel.pos] ?? [];
    const excludedKeys = new Set(excludedAfterEdge.map((c) => cellKey(c.i, c.j)));

    const eligibleCells = enumerateVisibleGridCells(fr, gr).filter(
      (cell) => !excludedKeys.has(cellKey(cell.i, cell.j)),
    );

    const previewRequest = {
      source: src,
      selection: sel,
      cells: eligibleCells.map((c) => ({
        i: c.i,
        j: c.j,
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
      })),
    };

    let preview;
    try {
      preview = await queryClient.fetchQuery({
        queryKey: queryKeys.autoExcludePreview(previewRequest),
        queryFn: () => backend.autoExcludePreview(previewRequest),
        staleTime: 0,
      });
    } catch (cause) {
      showErrorToast(toErrorMessage(cause));
      setSaving(false);
      return;
    }

    const threshold = preview.threshold;
    const cellsToExclude =
      preview.cellScores
        ?.filter((cell) => cell.score <= threshold)
        .map((cell) => ({ i: cell.i, j: cell.j })) ?? [];
    if (cellsToExclude.length > 0) {
      excludeCells(sel.pos, cellsToExclude);
    }

    const {
      grid: gridAfter,
      excludedCellsByPosition: exMap,
      frame: frameAfter,
      selection: selAfter,
      source: srcAfter,
    } = viewerStore.getState();

    if (!frameAfter || !selAfter || !srcAfter || !ws) {
      setSaving(false);
      return;
    }

    const excludedFinal = exMap[selAfter.pos] ?? [];

    let response;
    try {
      response = await saveBboxMutation.mutateAsync({
        workspacePath: ws,
        source: srcAfter,
        pos: selAfter.pos,
        csv: buildBboxCsv(frameAfter, gridAfter, excludedFinal),
        alignState: {
          grid: gridAfter,
          excludedCells: excludedFinal,
        },
      });
    } catch (cause) {
      showErrorToast(toErrorMessage(cause));
      setSaving(false);
      return;
    }

    setSaving(false);

    if (!response.ok) {
      showErrorToast(response.error ?? "Failed to save alignment outputs");
      return;
    }

    showSuccessToast(`Saved bbox for Pos${selAfter.pos}`);

    const scanFresh = viewerStore.getState().scan;
    const selFresh = viewerStore.getState().selection;
    if (!scanFresh || !selFresh) return;

    const nextSel = advanceStudioAlignSelection(scanFresh, selFresh);
    if (!nextSel) {
      showSuccessToast("Finished all positions and timepoints.");
      return;
    }

    patchViewState({
      selection: coerceSelection(scanFresh, nextSel),
    });
    const nt = scanFresh.times.indexOf(nextSel.time);
    setTimeSliderIndex(nt >= 0 ? nt : 0);
  }, [backend, queryClient, saveBboxMutation]);

  useEffect(() => {
    onRegisterCommit(commitAndAdvance);
    return () => {
      onRegisterCommit(null);
    };
  }, [commitAndAdvance, onRegisterCommit]);

  if (!backend) {
    return (
      <div className="text-muted-foreground flex min-h-[280px] flex-1 flex-col items-center justify-center px-6 text-center text-sm">
        <p>Alignment runs in the Studio desktop app (Tauri).</p>
        <p className="mt-2 font-mono text-xs">bun run dev</p>
      </div>
    );
  }

  if (!workspaceTrim || !sourceInferred) {
    return (
      <div className="text-muted-foreground flex min-h-[280px] flex-1 flex-col items-center justify-center px-6 text-center text-sm">
        Complete Basic info with Data path and Save to before aligning.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-black/10">
        <ViewerCanvasSurface
          frame={frame}
          grid={grid}
          previewGrid={previewGrid}
          excludedCells={renderedExcludedCells}
          loading={loading && !frame}
          emptyText={emptyText}
          cursor={canvasCursor}
          onVirtualPointerDown={handleCanvasPointerDown}
          onVirtualPointerMove={handleCanvasPointerMove}
          onVirtualPointerUp={handleCanvasPointerEnd}
          onVirtualPointerCancel={handleCanvasPointerEnd}
          onVirtualWheel={handleCanvasWheel}
        />
      </div>
    </div>
  );
}

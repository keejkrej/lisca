import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { ViewerDataPort } from "lisca/shared/contracts";
import {
  applyGridPointerGesture,
  applyGridWheelGesture,
  beginGridPointerGesture,
  buildBboxCsv,
  coerceSelection,
  collectEdgeCells,
  enumerateVisibleGridCells,
  type AlignPatternToolMode,
  type GridPointerGestureSession,
  type GridState,
} from "lisca/shared/core";
import {
  fetchAutoExcludePreview,
  useAlignStateQuery,
  useSaveBboxMutation,
  useScanSourceQuery,
} from "lisca/shared/query";

import AlignCanvasSurface from "./AlignCanvasSurface";
import {
  AlignStoreProvider,
  applyAlignSavedState,
  excludeAlignCells,
  patchAlignState,
  setAlignGrid,
  setAlignSaving,
  setAlignSource,
  setAlignTimeSliderIndex,
  setAlignWorkspacePath,
  useAlignStoreApi,
  type AlignStore,
} from "./alignStore";
import { advanceAlignSelection, initialAlignSelection } from "./advanceSelection";
import { inferSourceFromDataPath } from "./inferSource";
import type { AlignCanvasPointerEvent, AlignCanvasWheelEvent } from "./types";
import { useLoadRawFrameIntoAlignStore } from "./useLoadRawFrameIntoAlignStore";
import { showErrorToast, showSuccessToast } from "../toast";

function cellKey(i: number, j: number): string {
  return `${i}:${j}`;
}

export type AlignPatternCommitHandler = () => Promise<void>;

export interface AlignPatternStatus {
  ready: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export interface AlignPatternWorkspaceProps {
  /** Null when not running inside Tauri (plain Vite web). */
  dataPort: ViewerDataPort | null;
  dataPath: string;
  saveTo: string;
  store?: AlignStore;
  /** Primary-button tool from the Studio command bar; omit for legacy mouse chords (left=pan, middle=spacing, right=rotate). */
  toolMode?: AlignPatternToolMode;
  /** Registers the align-step "next" commit handler for a parent command bar. */
  onRegisterCommit: (handler: AlignPatternCommitHandler | null) => void;
  onStatusChange?: (status: AlignPatternStatus) => void;
}

function AlignPatternWorkspaceInner({
  dataPort,
  dataPath,
  saveTo,
  toolMode,
  onRegisterCommit,
  onStatusChange,
}: Omit<AlignPatternWorkspaceProps, "store">) {
  const store = useAlignStoreApi();
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
    saving,
  } = useStore(
    store,
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
      saving: state.saving,
    })),
  );

  const selectedPos = selection?.pos ?? null;
  const workspaceTrim = saveTo.trim();
  const sourceInferred = useMemo(() => inferSourceFromDataPath(dataPath), [dataPath]);

  const queryClient = useQueryClient();
  const saveBboxMutation = useSaveBboxMutation(backend);
  const scanSourceQuery = useScanSourceQuery(backend, sourceInferred, {
    enabled: Boolean(backend && workspaceTrim && sourceInferred),
  });
  const alignQuery = useAlignStateQuery(backend, workspacePath, selectedPos, {
    enabled: Boolean(backend && workspacePath && selectedPos != null),
  });

  useEffect(() => {
    if (!backend || !workspaceTrim || !sourceInferred) return;

    setAlignWorkspacePath(store, workspaceTrim);
    if (store.getState().source?.path !== sourceInferred.path || store.getState().source?.kind !== sourceInferred.kind) {
      setAlignSource(store, sourceInferred);
    }

    if (scanSourceQuery.isPending) {
      patchAlignState(store, {
        loading: true,
        error: null,
        frame: null,
        scan: null,
        selection: null,
        contrastMode: "manual",
      });
      return;
    }

    if (scanSourceQuery.isError) {
      patchAlignState(store, { loading: false, error: String(scanSourceQuery.error.message) });
      return;
    }

    if (scanSourceQuery.data) {
      const scanned = scanSourceQuery.data;
      const sel = coerceSelection(scanned, initialAlignSelection(scanned));
      patchAlignState(store, { scan: scanned, selection: sel, loading: false, error: null });
      setAlignGrid(store, (g) => ({ ...g, enabled: true }));
      const ti = scanned.times.indexOf(sel.time);
      setAlignTimeSliderIndex(store, ti >= 0 ? ti : 0);
    }
  }, [
    backend,
    scanSourceQuery.data,
    scanSourceQuery.error,
    scanSourceQuery.isError,
    scanSourceQuery.isPending,
    sourceInferred,
    store,
    workspaceTrim,
  ]);

  useEffect(() => {
    if (selectedPos == null) return;

    if (!workspacePath) {
      applyAlignSavedState(store, selectedPos, null);
      return;
    }

    if (alignQuery.isError) {
      showErrorToast(alignQuery.error.message);
      return;
    }

    if (alignQuery.isSuccess) {
      applyAlignSavedState(store, selectedPos, alignQuery.data);
      setAlignGrid(store, (g) => ({ ...g, enabled: true }));
    }
  }, [alignQuery.data, alignQuery.error, alignQuery.isError, alignQuery.isSuccess, selectedPos, store, workspacePath]);

  const contrastKey =
    contrastMode === "auto"
      ? `auto:${store.getState().contrastReloadToken}`
      : `${contrastMin}:${contrastMax}`;

  useLoadRawFrameIntoAlignStore({
    store,
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

  const ready = Boolean(
    backend &&
      workspaceTrim &&
      sourceInferred &&
      scan &&
      selection &&
      frame &&
      workspacePath?.trim().length &&
      !loading &&
      !saving,
  );

  useEffect(() => {
    onStatusChange?.({
      ready,
      loading,
      saving,
      error,
    });
  }, [error, loading, onStatusChange, ready, saving]);

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

  const canvasCursor = useMemo(() => {
    if (!grid.enabled) return "default";
    if (previewGrid) return "grabbing";
    if (toolMode === "pan") return "grab";
    if (toolMode === "rotate") return "crosshair";
    if (toolMode === "zoom") return "zoom-in";
    return "grab";
  }, [grid.enabled, previewGrid, toolMode]);

  const handleCanvasPointerDown = useCallback(
    (event: AlignCanvasPointerEvent) => {
      if (!grid.enabled) return;
      const session = beginGridPointerGesture(grid, event, toolMode);
      if (!session) return;
      dragSessionRef.current = session;
      event.capturePointer();
      event.preventDefault();
    },
    [grid, toolMode],
  );

  const handleCanvasPointerMove = useCallback((event: AlignCanvasPointerEvent) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId || !event.viewport) return;
    setPreviewGrid(applyGridPointerGesture(session, event, event.viewport));
    event.preventDefault();
  }, []);

  const handleCanvasPointerEnd = useCallback(
    (event: AlignCanvasPointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      dragSessionRef.current = null;
      if (previewGrid) {
        setAlignGrid(store, previewGrid);
      }
      setPreviewGrid(null);
      event.releasePointer();
    },
    [previewGrid, store],
  );

  const handleCanvasWheel = useCallback(
    (event: AlignCanvasWheelEvent) => {
      if (!frame || !grid.enabled || !event.viewport) return;
      event.preventDefault();
      dragSessionRef.current = null;
      setPreviewGrid(null);
      setAlignGrid(store, (current) => applyGridWheelGesture(current, event, event.viewport!));
    },
    [frame, grid.enabled, store],
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
    } = store.getState();

    if (!ws || !src || !sel || !fr || !sc || sc.positions.length === 0) {
      showErrorToast("Cannot save: missing workspace, frame, or scan.");
      return;
    }

    setAlignSaving(store, true);

    const edgeCells = collectEdgeCells(fr, gr);
    if (edgeCells.length > 0) {
      excludeAlignCells(store, sel.pos, edgeCells);
    }

    const excludedAfterEdge = store.getState().excludedCellsByPosition[sel.pos] ?? [];
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
      preview = await fetchAutoExcludePreview(queryClient, backend, previewRequest);
    } catch (cause) {
      showErrorToast(cause instanceof Error ? cause.message : String(cause));
      setAlignSaving(store, false);
      return;
    }

    const threshold = preview.threshold;
    const cellsToExclude =
      preview.cellScores
        ?.filter((cell) => cell.score <= threshold)
        .map((cell) => ({ i: cell.i, j: cell.j })) ?? [];
    if (cellsToExclude.length > 0) {
      excludeAlignCells(store, sel.pos, cellsToExclude);
    }

    const {
      grid: gridAfter,
      excludedCellsByPosition: exMap,
      frame: frameAfter,
      selection: selAfter,
      source: srcAfter,
    } = store.getState();

    if (!frameAfter || !selAfter || !srcAfter || !ws) {
      setAlignSaving(store, false);
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
      showErrorToast(cause instanceof Error ? cause.message : String(cause));
      setAlignSaving(store, false);
      return;
    }

    setAlignSaving(store, false);

    if (!response.ok) {
      showErrorToast(response.error ?? "Failed to save alignment outputs");
      return;
    }

    showSuccessToast(`Saved bbox for Pos${selAfter.pos}`);

    const scanFresh = store.getState().scan;
    const selFresh = store.getState().selection;
    if (!scanFresh || !selFresh) return;

    const nextSel = advanceAlignSelection(scanFresh, selFresh);
    if (!nextSel) {
      showSuccessToast("Finished all positions and timepoints.");
      return;
    }

    patchAlignState(store, {
      selection: coerceSelection(scanFresh, nextSel),
    });
    const nt = scanFresh.times.indexOf(nextSel.time);
    setAlignTimeSliderIndex(store, nt >= 0 ? nt : 0);
  }, [backend, queryClient, saveBboxMutation, store]);

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
        <AlignCanvasSurface
          frame={frame}
          grid={grid}
          previewGrid={previewGrid}
          excludedCells={currentPositionExcludedCells}
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

export default function AlignPatternWorkspace({
  store,
  ...props
}: AlignPatternWorkspaceProps) {
  return (
    <AlignStoreProvider store={store}>
      <AlignPatternWorkspaceInner {...props} />
    </AlignStoreProvider>
  );
}

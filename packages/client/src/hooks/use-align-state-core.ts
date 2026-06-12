import type { AlignGridCellCoord, AlignGridState, AlignerSource, AutoExcludePreviewResponse, ContrastWindow, CropRoiProgress, FrameRequest, SavedAlignState, WorkspaceScan } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import {
  cellsBelowVariationThreshold,
  cropPositionsAfterSkip,
  runCropRoi,
  type CropConfirmState,
} from "../session/align-session";
import type { AlignerDataPort } from "../ports/types";
import { useAlignSessionCore, type AlignWorkspaceSync } from "../session/use-align-session";
import { runClientEffect } from "../infra/runtime";
import type { CanvasResourceTransactionOptions } from "../canvas-resource-transaction";
import {
  alignStateFromCurrent,
  buildBboxCsv,
  collectAlignGridEdgeCells,
  countVisibleAlignGridCells,
  computeAutoExcludePreview,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import type { Atom, Result } from "@effect-atom/atom-react";
import { useAtom, useAtomValue } from "@effect-atom/atom-react";
import { Effect } from "effect";
import { useEffect, useRef, useState } from "react";
import type {
  AlignUiActions,
  AlignUiAtom,
  ExcludedByPosition,
  StateUpdater,
} from "../atoms/align-ui";
import { toClientError } from "../infra/client-error";
import {
  frameLoadRequest,
  shouldResetContrastBeforeNavigationLoad,
  shouldRunContrastFrameLoad,
} from "../session/frame-load-policy";
export type { CropConfirmState };
export type VariationExcludePreview = {
  preview: AutoExcludePreviewResponse;
  threshold: number;
};
export type AlignState = {
  workspacePath: string | null;
  source: AlignerSource | null;
  setSource: (source: AlignerSource | null) => void;
  scan: WorkspaceScan | null;
  scanLoading: boolean;
  frameLoading: boolean;
  error: string | null;
  selection: FrameRequest;
  setSelection: (patch: Partial<FrameRequest>) => void;
  contrast: ContrastWindow | null;
  setContrast: (contrast: ContrastWindow | null) => void;
  frame: FrameResult | null;
  grid: AlignGridState;
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
  toolMode: AlignGridToolMode;
  setToolMode: (mode: AlignGridToolMode) => void;
  patternZoomLocked: boolean;
  setPatternZoomLocked: (locked: boolean) => void;
  manualExclusionEnabled: boolean;
  setManualExclusionEnabled: (enabled: boolean) => void;
  excludedCellsByPosition: ExcludedByPosition;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  currentExcludedCells: AlignGridCellCoord[];
  displayedExcludedCells: AlignGridCellCoord[];
  visibleCounts: {
    included: number;
    excluded: number;
  };
  saving: boolean;
  cropping: boolean;
  cropProgress: CropRoiProgress | null;
  cropConfirm: CropConfirmState | null;
  status: string | null;
  saveCurrent: () => Promise<boolean>;
  cropCurrent: () => Promise<void>;
  cropBatch: () => Promise<void>;
  confirmCropOverwrite: () => void;
  skipExistingCrop: () => void;
  cancelCropConfirm: () => void;
  cancelCrop: () => Promise<void>;
  variationExcludePreview: VariationExcludePreview | null;
  variationExcludeLoading: boolean;
  variationExclude: () => Promise<void>;
  setVariationExcludeThreshold: (threshold: number) => void;
  cancelVariationExclude: () => void;
  applyVariationExclude: () => void;
  autoExclude: () => Promise<void>;
};
export type UseAlignStateCoreDeps = {
  alignerClient: AlignerDataPort;
  toErrorMessage: (cause: unknown, fallback: string) => string;
  effectErrorMessage: (cause: unknown) => string;
  loadFrameEffect: (
    backend: AlignerDataPort,
    source: AlignerSource,
    selection: FrameRequest,
    contrast: ContrastWindow | null,
  ) => import("effect").Effect.Effect<FrameResult, import("../infra/client-error.ts").ClientError>;
  alignerUiAtom: AlignUiAtom;
  alignerUiActions: AlignUiActions;
  scanSourceAtom: (sourceKey: string) => Atom.Atom<Result.Result<WorkspaceScan, unknown>>;
  scanIdleAtom: Atom.Atom<Result.Result<WorkspaceScan, unknown>>;
  savedAlignStateKey: (workspacePath: string, pos: number) => string;
  sourceKey: (source: AlignerSource | null) => string | null;
  useShellWorkspace: () => AlignWorkspaceSync;
  useCanvasResourceTransaction: () => <T>(
    options: CanvasResourceTransactionOptions<T>,
  ) => () => void;
};
export function useAlignStateCore(deps: UseAlignStateCoreDeps): AlignState {
  const workspace = deps.useShellWorkspace();
  const [ui, setUi] = useAtom(deps.alignerUiAtom);
  const {
    workspacePath,
    source,
    scan,
    selection,
    contrast,
    frame,
    grid,
    toolMode,
    patternZoomLocked,
    manualExclusionEnabled,
    excludedCellsByPosition,
    frameLoading,
    saving,
    cropProgress,
    error,
    status,
  } = ui;
  const loadCanvasResources = deps.useCanvasResourceTransaction();
  const cropRequestIdRef = useRef<string | null>(null);
  const [cropConfirm, setCropConfirm] = useState<CropConfirmState | null>(null);
  const [variationExcludePreview, setVariationExcludePreview] =
    useState<VariationExcludePreview | null>(null);
  const [variationExcludeLoading, setVariationExcludeLoading] = useState(false);
  const activeSourceKey = deps.sourceKey(source);
  const scanResult = useAtomValue(
    activeSourceKey ? deps.scanSourceAtom(activeSourceKey) : deps.scanIdleAtom,
  );
  const {
    actions: {
      setSource,
      setSelection,
      setContrast,
      setGrid,
      setToolMode,
      setPatternZoomLocked,
      setManualExclusionEnabled,
      setExcludedCellsForCurrentPosition,
    },
    meta: { scanLoading, cropping },
    derived: { currentExcludedCells, displayedExcludedCells, visibleCounts },
  } = useAlignSessionCore({
    ui,
    setUi,
    actions: deps.alignerUiActions,
    workspace: {
      workspacePath: workspace.workspacePath,
      setWorkspacePath: workspace.setWorkspacePath,
      sourcePath: workspace.sourcePath,
      setSourcePath: workspace.setSourcePath,
    },
    scan: {
      scanResult,
      activeSourceKey,
    },
    toErrorMessage: deps.toErrorMessage,
  });
  useEffect(() => {
    if (!source || !scan) {
      deps.alignerUiActions.setFrameLoading(setUi, false);
      return;
    }
    const alignStateKey = workspacePath
      ? deps.savedAlignStateKey(workspacePath, selection.pos)
      : null;
    return loadCanvasResources({
      start: () => {
        if (shouldResetContrastBeforeNavigationLoad()) {
          deps.alignerUiActions.setContrast(setUi, null);
        }
        deps.alignerUiActions.setFrameLoading(setUi, true);
        deps.alignerUiActions.setError(setUi, null);
        deps.alignerUiActions.setStatus(setUi, "Loading frame");
      },
      load: (signal) =>
        runClientEffect(
          Effect.all([
            deps.loadFrameEffect(
              deps.alignerClient,
              source,
              selection,
              frameLoadRequest({ kind: "navigation", contrast }),
            ),
            workspacePath
              ? deps.alignerClient.loadAlignState(workspacePath, selection.pos)
              : Effect.succeed(null as SavedAlignState | null),
          ]).pipe(Effect.mapError(toClientError)),
          {
            signal,
          },
        ),
      commit: ([nextFrame, savedAlignState]) => {
        deps.alignerUiActions.applyLoadedFrame(
          setUi,
          selection,
          nextFrame,
          alignStateKey
            ? {
                stateKey: alignStateKey,
                pos: selection.pos,
                saved: savedAlignState,
              }
            : null,
        );
      },
      reject: (cause) => {
        deps.alignerUiActions.setFrame(setUi, null);
        deps.alignerUiActions.setError(
          setUi,
          cause instanceof Error && cause.message.startsWith("Frame request failed")
            ? deps.effectErrorMessage(cause)
            : deps.toErrorMessage(cause, "Frame or saved align state load failed"),
        );
      },
      settle: () => deps.alignerUiActions.setFrameLoading(setUi, false),
    });
    // deps members are listed individually; omitting the aggregate avoids unrelated reruns.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    deps.alignerClient,
    deps.alignerUiActions,
    deps.loadFrameEffect,
    deps.savedAlignStateKey,
    deps.effectErrorMessage,
    deps.toErrorMessage,
    loadCanvasResources,
    scan,
    selection,
    setUi,
    source,
    workspacePath,
  ]);
  useEffect(() => {
    if (!shouldRunContrastFrameLoad(contrast) || !source || !scan) {
      return;
    }
    return loadCanvasResources({
      start: () => {
        deps.alignerUiActions.setFrameLoading(setUi, true);
        deps.alignerUiActions.setError(setUi, null);
      },
      load: (signal) =>
        runClientEffect(
          deps.loadFrameEffect(
            deps.alignerClient,
            source,
            selection,
            frameLoadRequest({ kind: "contrast", contrast }),
          ).pipe(
            Effect.mapError(toClientError),
          ),
          { signal },
        ),
      commit: (nextFrame) => {
        deps.alignerUiActions.setFrame(setUi, nextFrame);
        deps.alignerUiActions.setStatus(setUi, null);
      },
      reject: (cause) => {
        deps.alignerUiActions.setFrame(setUi, null);
        deps.alignerUiActions.setError(
          setUi,
          cause instanceof Error && cause.message.startsWith("Frame request failed")
            ? deps.effectErrorMessage(cause)
            : deps.toErrorMessage(cause, "Frame contrast update failed"),
        );
      },
      settle: () => deps.alignerUiActions.setFrameLoading(setUi, false),
    });
    // Intentionally contrast-only: frame navigation is handled by the effect above.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [contrast]);
  const saveCurrent = async () => {
    if (!workspacePath || !frame) return false;
    const { included } = countVisibleAlignGridCells(frame, grid, currentExcludedCells);
    if (included === 0) {
      deps.alignerUiActions.setError(
        setUi,
        "All grid cells are excluded — adjust exclusions before saving.",
      );
      return false;
    }
    deps.alignerUiActions.setSaving(setUi, true);
    deps.alignerUiActions.setError(setUi, null);
    try {
      const csv = buildBboxCsv(frame, grid, currentExcludedCells);
      const alignState = alignStateFromCurrent(grid, currentExcludedCells);
      const result = await runClientEffect(
        deps.alignerClient.saveBbox(workspacePath, selection.pos, csv, alignState),
      );
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      deps.alignerUiActions.setStatus(setUi, `Saved bbox/Pos${selection.pos}.csv`);
      return true;
    } catch (cause) {
      deps.alignerUiActions.setError(setUi, deps.toErrorMessage(cause, "Save failed"));
      return false;
    } finally {
      deps.alignerUiActions.setSaving(setUi, false);
    }
  };
  const runCrop = async (positions: number[], overwrite: boolean) => {
    if (!workspacePath || !source || positions.length === 0) return;
    const requestId = `crop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cropRequestIdRef.current = requestId;
    deps.alignerUiActions.setError(setUi, null);
    await runCropRoi({
      client: deps.alignerClient,
      request: {
        requestId,
        workspacePath,
        source,
        positions,
        overwrite,
        outputFormat: "tiff",
      },
      onProgress: (progress) => deps.alignerUiActions.setCropProgress(setUi, progress),
      onError: (message) => deps.alignerUiActions.setError(setUi, message),
      onCompleted: (progress) => {
        if (progress.message) deps.alignerUiActions.setStatus(setUi, progress.message);
      },
      toErrorMessage: deps.toErrorMessage,
    });
  };
  const cropCurrent = async () => {
    if (!workspacePath || !source || !frame) return;
    const saved = await saveCurrent();
    if (!saved) return;
    const exists = await runClientEffect(
      deps.alignerClient.roiPosExists(workspacePath, selection.pos),
    );
    if (exists) {
      setCropConfirm({
        kind: "single",
        positions: [selection.pos],
        existingPositions: [selection.pos],
      });
      return;
    }
    await runCrop([selection.pos], false);
  };
  const cropBatch = async () => {
    if (!workspacePath || !source) return;
    let savedPositions: number[];
    try {
      savedPositions = await runClientEffect(
        deps.alignerClient.listSavedBboxPositions(workspacePath),
      );
    } catch (cause) {
      deps.alignerUiActions.setError(
        setUi,
        deps.toErrorMessage(cause, "Saved bbox positions load failed"),
      );
      return;
    }
    if (savedPositions.length === 0) {
      deps.alignerUiActions.setStatus(setUi, "No saved bbox CSVs found");
      return;
    }
    const existing = await runClientEffect(
      Effect.all(
        savedPositions.map((pos) =>
          deps.alignerClient.roiPosExists(workspacePath, pos).pipe(
            Effect.map((exists) => ({
              pos,
              exists,
            })),
          ),
        ),
      ).pipe(
        Effect.map((entries) => entries.filter((entry) => entry.exists).map((entry) => entry.pos)),
      ),
    );
    if (existing.length > 0) {
      setCropConfirm({
        kind: "batch",
        positions: savedPositions,
        existingPositions: existing,
      });
      return;
    }
    await runCrop(savedPositions, false);
  };
  const confirmCropOverwrite = () => {
    const next = cropConfirm;
    if (!next) return;
    setCropConfirm(null);
    void runCrop(next.positions, true);
  };
  const skipExistingCrop = () => {
    const next = cropConfirm;
    if (!next || next.kind !== "batch") return;
    setCropConfirm(null);
    const remaining = cropPositionsAfterSkip(next.positions, next.existingPositions);
    if (remaining.length === 0) {
      deps.alignerUiActions.setStatus(
        setUi,
        `Skipped ${next.existingPositions.length} existing ROI output(s)`,
      );
      return;
    }
    void runCrop(remaining, false);
  };
  const cancelCropConfirm = () => {
    setCropConfirm(null);
  };
  const cancelCrop = async () => {
    const requestId = cropRequestIdRef.current;
    if (!requestId) return;
    deps.alignerUiActions.setCropProgress(
      setUi,
      await runClientEffect(deps.alignerClient.cancelCropRoi(requestId)),
    );
  };
  const previewVariationExclude = async () => {
    if (!frame) return null;
    const cells = enumerateVisibleAlignGridCells(frame, grid);
    if (cells.length === 0) return null;
    setVariationExcludeLoading(true);
    try {
      return computeAutoExcludePreview(frame, cells);
    } finally {
      setVariationExcludeLoading(false);
    }
  };
  const variationExclude = async () => {
    if (!source || !frame) return;
    deps.alignerUiActions.setStatus(setUi, "Var exclude preview");
    try {
      const preview = await previewVariationExclude();
      if (!preview) {
        deps.alignerUiActions.setStatus(setUi, "No visible cells for var exclude");
        return;
      }
      setVariationExcludePreview({
        preview,
        threshold: preview.threshold,
      });
    } catch (cause) {
      deps.alignerUiActions.setError(
        setUi,
        deps.toErrorMessage(cause, "Var exclude preview failed"),
      );
    }
  };
  const setVariationExcludeThreshold = (threshold: number) => {
    setVariationExcludePreview((current) =>
      current
        ? {
            ...current,
            threshold,
          }
        : current,
    );
  };
  const cancelVariationExclude = () => {
    setVariationExcludePreview(null);
    deps.alignerUiActions.setStatus(setUi, "Var exclude cancelled");
  };
  const applyVariationExclude = () => {
    if (!variationExcludePreview) return;
    const variationCells = cellsBelowVariationThreshold(
      variationExcludePreview.preview,
      variationExcludePreview.threshold,
    );
    setExcludedCellsForCurrentPosition(
      mergeExcludedAlignGridCells(currentExcludedCells, variationCells),
    );
    setVariationExcludePreview(null);
    deps.alignerUiActions.setStatus(
      setUi,
      `Var excluded ${variationCells.length} of ${variationExcludePreview.preview.eligibleCellCount} cells`,
    );
  };
  const autoExclude = async () => {
    if (!source || !frame) return;
    deps.alignerUiActions.setStatus(setUi, "Auto exclude");
    try {
      const edgeCells = collectAlignGridEdgeCells(frame, grid);
      const preview = await previewVariationExclude();
      const variationCells = preview
        ? cellsBelowVariationThreshold(preview, preview.threshold)
        : [];
      const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
        ...edgeCells,
        ...variationCells,
      ]);
      setExcludedCellsForCurrentPosition(finalExcludedCells);
      deps.alignerUiActions.setStatus(
        setUi,
        `Auto excluded ${finalExcludedCells.length - currentExcludedCells.length} cells`,
      );
    } catch (cause) {
      deps.alignerUiActions.setError(setUi, deps.toErrorMessage(cause, "Auto exclude failed"));
    }
  };
  return {
    workspacePath,
    source,
    setSource,
    scan,
    scanLoading,
    frameLoading,
    error,
    selection,
    setSelection,
    contrast,
    setContrast,
    frame,
    grid,
    setGrid,
    toolMode,
    setToolMode,
    patternZoomLocked,
    setPatternZoomLocked,
    manualExclusionEnabled,
    setManualExclusionEnabled,
    excludedCellsByPosition,
    setExcludedCellsForCurrentPosition,
    currentExcludedCells,
    displayedExcludedCells,
    visibleCounts,
    saving,
    cropping,
    cropProgress,
    cropConfirm,
    status,
    saveCurrent,
    cropCurrent,
    cropBatch,
    confirmCropOverwrite,
    skipExistingCrop,
    cancelCropConfirm,
    cancelCrop,
    variationExcludePreview,
    variationExcludeLoading,
    variationExclude,
    setVariationExcludeThreshold,
    cancelVariationExclude,
    applyVariationExclude,
    autoExclude,
  };
}
export type { ExcludedByPosition, StateUpdater };

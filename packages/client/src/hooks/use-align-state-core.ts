import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  AutoExcludePreviewResponse,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import {
  cellsBelowVariationThreshold,
  cropPositionsAfterSkip,
  runCropRoi,
  type CropConfirmState,
} from "../session/align-session";
import type { AlignerDataPort } from "../ports/types";
import { useAlignSessionCore } from "../session/use-align-session";
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
import type { Atom, Result } from "@effect-atom/atom-solid";
import { RegistryContext, useAtom } from "@effect-atom/atom-solid";
import { Effect } from "effect";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  useContext,
  type Accessor,
} from "solid-js";
import type {
  AlignUiActions,
  AlignUiAtom,
  ExcludedByPosition,
  StateUpdater,
} from "../atoms/align-ui";
import { toClientError } from "../infra/client-error";
import {
  frameLoadRequest,
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
  applySmartExclusion: (modelCells: AlignGridCellCoord[]) => void;
  reportError: (message: string | null) => void;
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
  useShellWorkspace: () => {
    workspacePath: string | null;
    setWorkspacePath: (path: string | null) => void;
    sourcePath: string | null;
    setSourcePath: (path: string | null) => void;
  };
  useCanvasResourceTransaction: () => <T>(
    options: CanvasResourceTransactionOptions<T>,
  ) => () => void;
};

export function useAlignStateCore(deps: UseAlignStateCoreDeps): Accessor<AlignState> {
  const workspace = deps.useShellWorkspace();
  const [ui, setUi] = useAtom(deps.alignerUiAtom);
  const loadCanvasResources = deps.useCanvasResourceTransaction();
  let cropRequestIdRef: string | null = null;
  const [cropConfirm, setCropConfirm] = createSignal<CropConfirmState | null>(null);
  const [variationExcludePreview, setVariationExcludePreview] =
    createSignal<VariationExcludePreview | null>(null);
  const [variationExcludeLoading, setVariationExcludeLoading] = createSignal(false);

  const activeSourceKey = createMemo(() => deps.sourceKey(ui().source));
  const navSource = createMemo(() => ui().source);
  const navScan = createMemo(() => ui().scan);
  const navSelection = createMemo(() => ui().selection);
  const navWorkspacePath = createMemo(() => ui().workspacePath);
  const navContrast = createMemo(() => ui().contrast);
  const scanResult = useSelectedAtomValue(() => {
    const key = activeSourceKey();
    return key ? deps.scanSourceAtom(key) : deps.scanIdleAtom;
  });

  const session = useAlignSessionCore({
    ui,
    setUi,
    actions: deps.alignerUiActions,
    workspace: {
      workspacePath: () => workspace.workspacePath,
      setWorkspacePath: workspace.setWorkspacePath,
      sourcePath: () => workspace.sourcePath,
      setSourcePath: workspace.setSourcePath,
    },
    scan: {
      scanResult,
      activeSourceKey,
    },
    toErrorMessage: deps.toErrorMessage,
  });

  const {
    setSource,
    setSelection,
    setContrast,
    setGrid,
    setToolMode,
    setPatternZoomLocked,
    setManualExclusionEnabled,
    setExcludedCellsForCurrentPosition,
  } = session.actions;

  createEffect(() => {
    const source = navSource();
    const scan = navScan();
    const selection = navSelection();
    const workspacePath = navWorkspacePath();
    if (!source || !scan) {
      deps.alignerUiActions.setFrameLoading(setUi, false);
      return;
    }
    const alignStateKey = workspacePath
      ? deps.savedAlignStateKey(workspacePath, selection.pos)
      : null;
    const cleanup = loadCanvasResources({
      start: () => {
        deps.alignerUiActions.setContrast(setUi, null);
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
              frameLoadRequest({ kind: "navigation", contrast: null }),
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
    onCleanup(cleanup);
  });

  createEffect(() => {
    const contrast = navContrast();
    if (!shouldRunContrastFrameLoad(contrast)) {
      return;
    }
    const { source, scan, selection } = untrack(() => ui());
    if (!source || !scan) {
      return;
    }
    const cleanup = loadCanvasResources({
      start: () => {
        deps.alignerUiActions.setFrameLoading(setUi, true);
        deps.alignerUiActions.setError(setUi, null);
      },
      load: (signal) =>
        runClientEffect(
          deps
            .loadFrameEffect(
              deps.alignerClient,
              source,
              selection,
              frameLoadRequest({ kind: "contrast", contrast }),
            )
            .pipe(Effect.mapError(toClientError)),
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
    onCleanup(cleanup);
  });

  const saveCurrent = async () => {
    const currentUi = ui();
    const { workspacePath, frame, grid, selection } = currentUi;
    const currentExcludedCells = session.derived().currentExcludedCells;
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
    const currentUi = ui();
    const { workspacePath, source } = currentUi;
    if (!workspacePath || !source || positions.length === 0) return;
    const requestId = `crop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cropRequestIdRef = requestId;
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
    const currentUi = ui();
    const { workspacePath, source, frame, selection } = currentUi;
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
    const currentUi = ui();
    const { workspacePath, source } = currentUi;
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
    const next = cropConfirm();
    if (!next) return;
    setCropConfirm(null);
    void runCrop(next.positions, true);
  };

  const skipExistingCrop = () => {
    const next = cropConfirm();
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
    const requestId = cropRequestIdRef;
    if (!requestId) return;
    deps.alignerUiActions.setCropProgress(
      setUi,
      await runClientEffect(deps.alignerClient.cancelCropRoi(requestId)),
    );
  };

  const previewVariationExclude = async () => {
    const currentUi = ui();
    const { frame, grid } = currentUi;
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
    const currentUi = ui();
    const { source, frame } = currentUi;
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
    const preview = variationExcludePreview();
    if (!preview) return;
    const currentExcludedCells = session.derived().currentExcludedCells;
    const variationCells = cellsBelowVariationThreshold(preview.preview, preview.threshold);
    setExcludedCellsForCurrentPosition(
      mergeExcludedAlignGridCells(currentExcludedCells, variationCells),
    );
    setVariationExcludePreview(null);
    deps.alignerUiActions.setStatus(
      setUi,
      `Var excluded ${variationCells.length} of ${preview.preview.eligibleCellCount} cells`,
    );
  };

  const autoExclude = async () => {
    const currentUi = ui();
    const { source, frame, grid } = currentUi;
    const currentExcludedCells = session.derived().currentExcludedCells;
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

  const applySmartExclusion = (modelCells: AlignGridCellCoord[]) => {
    const currentUi = ui();
    const { frame, grid } = currentUi;
    const currentExcludedCells = session.derived().currentExcludedCells;
    if (!frame) return;
    const edgeCells = collectAlignGridEdgeCells(frame, grid);
    const finalExcludedCells = mergeExcludedAlignGridCells(currentExcludedCells, [
      ...edgeCells,
      ...modelCells,
    ]);
    setExcludedCellsForCurrentPosition(finalExcludedCells);
    deps.alignerUiActions.setStatus(
      setUi,
      `Smart excluded ${finalExcludedCells.length - currentExcludedCells.length} cells`,
    );
  };

  return createMemo<AlignState>(() => {
    const currentUi = ui();
    const meta = session.meta();
    const derived = session.derived();
    return {
      workspacePath: currentUi.workspacePath,
      source: currentUi.source,
      setSource,
      scan: currentUi.scan,
      scanLoading: meta.scanLoading,
      frameLoading: currentUi.frameLoading,
      error: currentUi.error,
      selection: derived.selection,
      setSelection,
      contrast: currentUi.contrast,
      setContrast,
      frame: currentUi.frame,
      grid: currentUi.grid,
      setGrid,
      toolMode: currentUi.toolMode,
      setPatternZoomLocked,
      patternZoomLocked: currentUi.patternZoomLocked,
      setToolMode,
      manualExclusionEnabled: currentUi.manualExclusionEnabled,
      setManualExclusionEnabled,
      excludedCellsByPosition: currentUi.excludedCellsByPosition,
      setExcludedCellsForCurrentPosition,
      currentExcludedCells: derived.currentExcludedCells,
      displayedExcludedCells: derived.displayedExcludedCells,
      visibleCounts: derived.visibleCounts,
      saving: currentUi.saving,
      cropping: meta.cropping,
      cropProgress: currentUi.cropProgress,
      cropConfirm: cropConfirm(),
      status: currentUi.status,
      saveCurrent,
      cropCurrent,
      cropBatch,
      confirmCropOverwrite,
      skipExistingCrop,
      cancelCropConfirm,
      cancelCrop,
      variationExcludePreview: variationExcludePreview(),
      variationExcludeLoading: variationExcludeLoading(),
      variationExclude,
      setVariationExcludeThreshold,
      cancelVariationExclude,
      applyVariationExclude,
      autoExclude,
      applySmartExclusion,
      reportError: (message) => deps.alignerUiActions.setError(setUi, message),
    };
  });
}

export type { ExcludedByPosition, StateUpdater };

function useSelectedAtomValue<A>(selectAtom: () => Atom.Atom<A>): Accessor<A> {
  const registry = useContext(RegistryContext);
  const [value, setValue] = createSignal(registry.get(selectAtom()));
  createEffect(() => {
    const atom = selectAtom();
    setValue(() => registry.get(atom));
    onCleanup(registry.subscribe(atom, setValue as (next: A) => void));
  });
  return value;
}
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
  alignStateFromCurrent,
  buildBboxCsv,
  collectAlignGridEdgeCells,
  computeAutoExcludePreview,
  countVisibleAlignGridCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
  type AlignGridToolMode,
} from "@lisca/utils";
import type { AsyncResult, Atom } from "effect/unstable/reactivity";
import { useAtom } from "@effect/atom-solid";
import { Effect } from "effect";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
  type Accessor,
} from "solid-js";
import { useSelectedAtomValue } from "../atoms/selected-atom-value";
import {
  applyVariationExcludePreview,
  applyVariationExcludeWithEdge,
  cropPositionsAfterSkip,
  cropRequestIdForCancellation,
  deriveCurrentExcludedCells,
  deriveDisplayedExcludedCells,
  deriveVisibleCounts,
  isCropping,
  mergeAutoExcludedAlignCells,
  runCropRoi,
  shouldApplySourceScan,
  updateVariationExcludeThreshold,
  type CropConfirmState,
  type VariationExcludePreview,
} from "./align-session";
import {
  savedAlignStateKey,
  sourceKey,
  type AlignUiActions,
  type AlignUiAtom,
  type AlignUiState,
} from "../atoms/align-ui";
import { resultData, resultFailureMessage, resultLoading } from "../atoms/result-utils";
import type { CanvasResourceTransactionOptions } from "../canvas-resource-transaction";
import { toClientError, type ClientError } from "../infra/client-error";
import { runClientEffect } from "../infra/runtime";
import type { AlignerDataPort } from "../ports/types";
import { currentServerKey } from "./work-session";

export type AlignSessionMeta = {
  scanLoading: boolean;
  frameLoading: boolean;
  saving: boolean;
  cropping: boolean;
};

export type AlignSessionActions = {
  setWorkspacePath: (path: string | null) => void;
  setSource: (source: AlignerSource | null) => void;
  setSelection: (patch: Partial<FrameRequest>) => void;
  setContrast: (contrast: ContrastWindow | null) => void;
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
  setToolMode: (mode: AlignGridToolMode) => void;
  setSpacingZoomLocked: (locked: boolean) => void;
  setPatternZoomLocked: (locked: boolean) => void;
  setManualExclusionEnabled: (enabled: boolean) => void;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  reportError: (message: string | null) => void;
  reportStatus: (message: string | null) => void;
};

export type AlignSessionStore = {
  atom: AlignUiAtom;
  actions: AlignUiActions;
};

export type AlignWorkspaceSync = {
  workspacePath: Accessor<string | null>;
  setWorkspacePath: (path: string | null) => void;
  sourcePath: Accessor<string | null>;
  setSourcePath: (path: string | null) => void;
};

export type AlignScanSource = {
  forSource: (sourceKey: string) => Atom.Atom<AsyncResult.AsyncResult<WorkspaceScan, unknown>>;
  idle: Atom.Atom<AsyncResult.AsyncResult<WorkspaceScan, unknown>>;
};

export type AlignSessionBackend = {
  client: AlignerDataPort;
  loadFrame: (
    backend: AlignerDataPort,
    source: AlignerSource,
    selection: FrameRequest,
    contrast: ContrastWindow | null,
  ) => Effect.Effect<FrameResult, ClientError>;
  toErrorMessage: (cause: unknown, fallback: string) => string;
  frameErrorMessage: (cause: unknown) => string;
};

export type AlignSessionResources = {
  transact: <T>(options: CanvasResourceTransactionOptions<T>) => () => void;
};

export type AlignSessionPolicy = {
  /** Host-owned workspace/source values (Studio derives these from its assay wizard). */
  workspacePath?: Accessor<string | null>;
  source?: Accessor<AlignerSource | null>;
  /** Selection after host-specific locking (Studio locks channel/time/z and assay position). */
  selection?: (state: AlignUiState) => FrameRequest;
  /** Whether the current host policy permits loading a frame. */
  canLoadFrame?: (state: AlignUiState) => boolean;
  /** Studio preserves the prior frame when a contrast refresh fails. */
  preserveFrameOnContrastFailure?: boolean;
  /**
   * When false, crop actions no-op (light Aligner shell). Default true for Studio.
   * Crop is Studio / `lisca-crop` / pyama-v2 — not standalone Aligner.
   */
  enableCrop?: boolean;
  cropRequestPrefix?: string;
  cropServerIdentity?: () => string;
  onCropCompleted?: (progress: CropRoiProgress) => void;
  onCropSkippedAll?: () => void;
};

export type UseAlignSessionCoreOptions = {
  store: AlignSessionStore;
  backend: AlignSessionBackend;
  resources: AlignSessionResources;
  scan: AlignScanSource;
  workspace?: AlignWorkspaceSync;
  policy?: AlignSessionPolicy;
};

export type { VariationExcludePreview } from "./align-session";

export function useAlignSessionCore(options: UseAlignSessionCoreOptions) {
  const { backend, resources, scan, store, workspace } = options;
  const policy = options.policy ?? {};
  const actions = store.actions;
  const [ui, setUi] = useAtom(() => store.atom);
  const [cropConfirm, setCropConfirm] = createSignal<CropConfirmState | null>(null);
  const [variationExcludePreview, setVariationExcludePreview] =
    createSignal<VariationExcludePreview | null>(null);
  const [variationExcludeLoading, setVariationExcludeLoading] = createSignal(false);
  let stopCropProgress: () => void = () => {};
  onCleanup(() => stopCropProgress());

  const activeSourceKey = createMemo(() => sourceKey(ui().source));
  const scanResult = useSelectedAtomValue(() => {
    const key = activeSourceKey();
    return key ? scan.forSource(key) : scan.idle;
  });
  const navSource = createMemo(() => ui().source);
  const navScan = createMemo(() => ui().scan);
  const navSelection = createMemo<FrameRequest>((previous) => {
    const currentUi = ui();
    const next = policy.selection?.(currentUi) ?? currentUi.selection;
    return previous && sameFrameRequest(previous, next) ? previous : next;
  });
  const navWorkspacePath = createMemo(() => ui().workspacePath);
  const navContrast = createMemo(() => ui().contrast);
  const canLoadFrame = createMemo(() => policy.canLoadFrame?.(ui()) ?? true);

  const sessionActions: AlignSessionActions = {
    setWorkspacePath: (path) => actions.setWorkspacePath(setUi, path),
    setSource: (source: AlignerSource | null) => actions.setSource(setUi, source),
    setSelection: (patch) => actions.setSelection(setUi, patch),
    setContrast: (contrast) => actions.setContrast(setUi, contrast),
    setGrid: (next) => actions.setGrid(setUi, next),
    setToolMode: (mode) => actions.setToolMode(setUi, mode),
    setSpacingZoomLocked: (locked) => actions.setSpacingZoomLocked(setUi, locked),
    setPatternZoomLocked: (locked) => actions.setPatternZoomLocked(setUi, locked),
    setManualExclusionEnabled: (enabled) => actions.setManualExclusionEnabled(setUi, enabled),
    setExcludedCellsForCurrentPosition: (cells) =>
      actions.setExcludedCellsForPosition(setUi, navSelection().pos, cells),
    reportError: (message) => actions.setError(setUi, message),
    reportStatus: (message) => actions.setStatus(setUi, message),
  };

  createEffect(() => {
    if (!policy.workspacePath) return;
    actions.setWorkspacePath(setUi, policy.workspacePath());
  });

  createEffect(() => {
    if (!policy.source) return;
    actions.setSource(setUi, policy.source());
  });

  createEffect(() => {
    if (!workspace) return;
    const currentUi = ui();
    const shellWorkspacePath = workspace.workspacePath();
    if (shellWorkspacePath === currentUi.workspacePath) return;
    if (shellWorkspacePath == null && currentUi.workspacePath != null) {
      workspace.setWorkspacePath(currentUi.workspacePath);
      return;
    }
    actions.setWorkspacePath(setUi, shellWorkspacePath);
  });

  createEffect(() => {
    if (!workspace) return;
    const sourcePath = ui().source?.path ?? null;
    if (workspace.sourcePath() !== sourcePath) {
      workspace.setSourcePath(sourcePath);
    }
  });

  createEffect(() => {
    const currentUi = ui();
    if (!currentUi.source || !resultLoading(scanResult())) return;
    if (currentUi.error === null && currentUi.status === "Scanning source") return;
    actions.setError(setUi, null);
    actions.setStatus(setUi, "Scanning source");
  });

  createEffect(() => {
    const currentUi = ui();
    const scanData = resultData(scanResult());
    const key = activeSourceKey();
    if (!scanData || !key) return;
    if (!shouldApplySourceScan(currentUi.scanSourceKey, key)) return;
    actions.applySourceScan(setUi, key, scanData);
  });

  createEffect(() => {
    const message = resultFailureMessage(scanResult());
    if (message == null || message === "") return;
    actions.setFrame(setUi, null);
    actions.setError(setUi, message);
  });

  createEffect(() => {
    if (!policy.selection) return;
    const selection = ui().selection;
    const effective = navSelection();
    if (sameFrameRequest(selection, effective)) return;
    actions.setSelection(setUi, effective);
  });

  createEffect(() => {
    const source = navSource();
    const sourceScan = navScan();
    const selection = navSelection();
    const workspacePath = navWorkspacePath();
    if (!source || !sourceScan || !canLoadFrame()) {
      actions.setFrameLoading(setUi, false);
      return;
    }
    const stateKey = workspacePath ? savedAlignStateKey(workspacePath, selection.pos) : null;
    const cleanup = resources.transact({
      start: () => {
        actions.setContrast(setUi, null);
        actions.setFrameLoading(setUi, true);
        actions.setError(setUi, null);
        actions.setStatus(setUi, "Loading frame");
      },
      load: (signal) =>
        runClientEffect(
          Effect.all([
            backend.loadFrame(backend.client, source, selection, null),
            workspacePath
              ? backend.client.loadAlignState(workspacePath, selection.pos)
              : Effect.succeed(null as SavedAlignState | null),
          ]).pipe(Effect.mapError(toClientError)),
          { signal },
        ),
      commit: ([frame, saved]) => {
        actions.applyLoadedFrame(
          setUi,
          selection,
          frame,
          stateKey ? { stateKey, pos: selection.pos, saved } : null,
        );
      },
      reject: (cause) => {
        actions.setFrame(setUi, null);
        actions.setError(
          setUi,
          frameLoadError(backend, cause, "Frame or saved align state load failed"),
        );
      },
      settle: () => actions.setFrameLoading(setUi, false),
    });
    onCleanup(cleanup);
  });

  createEffect(() => {
    const contrast = navContrast();
    if (contrast == null) return;
    const { source, sourceScan, selection, loadAllowed } = untrack(() => ({
      source: navSource(),
      sourceScan: navScan(),
      selection: navSelection(),
      loadAllowed: canLoadFrame(),
    }));
    if (!source || !sourceScan || !loadAllowed) return;
    const cleanup = resources.transact({
      start: () => {
        actions.setFrameLoading(setUi, true);
        actions.setError(setUi, null);
      },
      load: (signal) =>
        runClientEffect(
          backend
            .loadFrame(backend.client, source, selection, contrast)
            .pipe(Effect.mapError(toClientError)),
          { signal },
        ),
      commit: (frame) => {
        actions.setFrame(setUi, frame);
        actions.setStatus(setUi, null);
      },
      reject: (cause) => {
        if (!policy.preserveFrameOnContrastFailure) actions.setFrame(setUi, null);
        actions.setError(setUi, frameLoadError(backend, cause, "Frame contrast update failed"));
      },
      settle: () => actions.setFrameLoading(setUi, false),
    });
    onCleanup(cleanup);
  });

  const derived = createMemo(() => {
    const currentUi = ui();
    const selection = navSelection();
    const scanLoading = currentUi.source != null && resultLoading(scanResult());
    const currentExcludedCells = deriveCurrentExcludedCells(
      currentUi.excludedCellsByPosition,
      selection.pos,
    );
    const displayedExcludedCells = deriveDisplayedExcludedCells(
      currentUi.excludedCellsByPosition,
      currentUi.loadedFrameSelection?.pos,
      selection.pos,
    );
    const visibleCounts = deriveVisibleCounts(
      currentUi.frame,
      currentUi.grid,
      displayedExcludedCells,
    );
    const cropping = isCropping(currentUi.cropProgress);
    const meta: AlignSessionMeta = {
      scanLoading,
      frameLoading: currentUi.frameLoading,
      saving: currentUi.saving,
      cropping,
    };
    return {
      currentExcludedCells,
      displayedExcludedCells,
      visibleCounts,
      selection,
      meta,
    };
  });

  const saveCurrent = async (excludedCells?: Iterable<AlignGridCellCoord>) => {
    const currentUi = ui();
    const selection = navSelection();
    const { workspacePath, frame, grid } = currentUi;
    if (!workspacePath || !frame) return false;
    const cells = excludedCells
      ? Array.from(excludedCells)
      : deriveCurrentExcludedCells(currentUi.excludedCellsByPosition, selection.pos);
    const { included } = countVisibleAlignGridCells(frame, grid, cells);
    if (included === 0) {
      actions.setError(setUi, "All grid cells are excluded — adjust exclusions before saving.");
      return false;
    }
    actions.setSaving(setUi, true);
    actions.setError(setUi, null);
    try {
      if (excludedCells) actions.setExcludedCellsForPosition(setUi, selection.pos, cells);
      const result = await runClientEffect(
        backend.client.saveBbox(
          workspacePath,
          selection.pos,
          buildBboxCsv(frame, grid, cells),
          alignStateFromCurrent(grid, cells),
        ),
      );
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      actions.setStatus(setUi, null);
      return true;
    } catch (cause) {
      actions.setError(setUi, backend.toErrorMessage(cause, "Save failed"));
      return false;
    } finally {
      actions.setSaving(setUi, false);
    }
  };

  const smartExcludedCells = (modelCells: AlignGridCellCoord[]) => {
    const currentUi = ui();
    if (!currentUi.frame) return null;
    const current = deriveCurrentExcludedCells(
      currentUi.excludedCellsByPosition,
      navSelection().pos,
    );
    return mergeExcludedAlignGridCells(current, [
      ...collectAlignGridEdgeCells(currentUi.frame, currentUi.grid),
      ...modelCells,
    ]);
  };

  const applySmartExclusion = (modelCells: AlignGridCellCoord[]) => {
    const current = derived().currentExcludedCells;
    const cells = smartExcludedCells(modelCells);
    if (!cells) return;
    sessionActions.setExcludedCellsForCurrentPosition(cells);
    actions.setStatus(setUi, `Smart excluded ${cells.length - current.length} cells`);
  };

  const saveWithSmartExclusion = async (modelCells: AlignGridCellCoord[]) => {
    const cells = smartExcludedCells(modelCells);
    return cells ? saveCurrent(cells) : false;
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
    sessionActions.reportStatus("Var exclude preview");
    try {
      const preview = await previewVariationExclude();
      if (!preview) {
        sessionActions.reportStatus("No visible cells for var exclude");
        return;
      }
      setVariationExcludePreview({
        preview,
        threshold: preview.threshold,
      });
    } catch (cause) {
      sessionActions.reportError(backend.toErrorMessage(cause, "Var exclude preview failed"));
    }
  };

  const setVariationExcludeThreshold = (threshold: number) => {
    setVariationExcludePreview((current) => updateVariationExcludeThreshold(current, threshold));
  };

  const dismissVariationExcludePreview = () => {
    setVariationExcludePreview(null);
  };

  const cancelVariationExclude = () => {
    if (!variationExcludePreview()) return;
    dismissVariationExcludePreview();
    sessionActions.reportStatus("Var exclude cancelled");
  };

  const applyVariationExclude = () => {
    const preview = variationExcludePreview();
    const currentUi = ui();
    const { frame, grid } = currentUi;
    if (!preview || !frame) return;
    const currentExcludedCells = derived().currentExcludedCells;
    const applied = applyVariationExcludeWithEdge(currentExcludedCells, frame, grid, preview);
    sessionActions.setExcludedCellsForCurrentPosition(applied.cells);
    setVariationExcludePreview(null);
    sessionActions.reportStatus(
      `Var excluded ${applied.variationCells.length} of ${applied.eligibleCellCount} cells`,
    );
  };

  const autoExclude = async () => {
    const currentUi = ui();
    const { source, frame, grid } = currentUi;
    const currentExcludedCells = derived().currentExcludedCells;
    if (!source || !frame) return;
    sessionActions.reportStatus("Auto exclude");
    try {
      const preview = await previewVariationExclude();
      const finalExcludedCells = mergeAutoExcludedAlignCells(
        currentExcludedCells,
        frame,
        grid,
        preview,
        preview?.threshold,
      );
      sessionActions.setExcludedCellsForCurrentPosition(finalExcludedCells);
      sessionActions.reportStatus(
        `Auto excluded ${finalExcludedCells.length - currentExcludedCells.length} cells`,
      );
    } catch (cause) {
      sessionActions.reportError(backend.toErrorMessage(cause, "Auto exclude failed"));
    }
  };

  const cropDisabledMessage =
    "ROI crop is not available in Aligner. Use Studio, lisca-crop, or pyama-v2.";

  const runCrop = async (positions: number[], overwrite: boolean) => {
    if (policy.enableCrop === false) {
      actions.setStatus(setUi, cropDisabledMessage);
      return;
    }
    const { workspacePath, source } = ui();
    if (!workspacePath || !source || positions.length === 0) return;
    const requestId = `${policy.cropRequestPrefix ?? "crop"}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    actions.setError(setUi, null);
    stopCropProgress();
    stopCropProgress = await runCropRoi({
      client: backend.client,
      request: {
        requestId,
        workspacePath,
        source,
        positions,
        overwrite,
        outputFormat: "tiff",
      },
      serverIdentity: policy.cropServerIdentity?.() ?? currentServerKey("aligner"),
      onProgress: (progress) => actions.setCropProgress(setUi, progress),
      onError: (message) => actions.setError(setUi, message),
      onCompleted: (progress) => {
        actions.setStatus(setUi, progress.message ?? "Crop completed");
        policy.onCropCompleted?.(progress);
      },
      toErrorMessage: backend.toErrorMessage,
    });
  };

  const checkCropOverwrite = async (
    positions: number[],
    kind: CropConfirmState["kind"] = "batch",
  ) => {
    if (policy.enableCrop === false) {
      actions.setStatus(setUi, cropDisabledMessage);
      return;
    }
    const workspacePath = ui().workspacePath;
    if (!workspacePath || positions.length === 0) return;
    try {
      const entries = await runClientEffect(
        Effect.all(
          positions.map((pos) =>
            backend.client
              .roiPosExists(workspacePath, pos)
              .pipe(Effect.map((exists) => ({ pos, exists }))),
          ),
        ),
      );
      const existingPositions = entries.filter(({ exists }) => exists).map(({ pos }) => pos);
      if (existingPositions.length > 0) {
        setCropConfirm({ kind, positions, existingPositions });
        return;
      }
      await runCrop(positions, false);
    } catch (cause) {
      actions.setError(setUi, backend.toErrorMessage(cause, "ROI output check failed"));
    }
  };

  const cropCurrent = async () => {
    if (policy.enableCrop === false) {
      actions.setStatus(setUi, cropDisabledMessage);
      return;
    }
    const currentUi = ui();
    if (!currentUi.workspacePath || !currentUi.source || !currentUi.frame) return;
    const position = navSelection().pos;
    if (!(await saveCurrent())) return;
    await checkCropOverwrite([position], "single");
  };

  const cropSaved = async () => {
    if (policy.enableCrop === false) {
      actions.setStatus(setUi, cropDisabledMessage);
      return;
    }
    const { workspacePath, source } = ui();
    if (!workspacePath || !source) return;
    try {
      const positions = await runClientEffect(backend.client.listSavedBboxPositions(workspacePath));
      if (positions.length === 0) {
        actions.setStatus(setUi, "No saved bbox CSVs found");
        return;
      }
      await checkCropOverwrite(positions, "batch");
    } catch (cause) {
      actions.setError(setUi, backend.toErrorMessage(cause, "Saved bbox positions load failed"));
    }
  };

  const confirmCropOverwrite = () => {
    const confirmation = cropConfirm();
    if (!confirmation) return;
    setCropConfirm(null);
    void runCrop(confirmation.positions, true);
  };

  const skipExistingCrop = () => {
    const confirmation = cropConfirm();
    if (!confirmation || confirmation.kind !== "batch") return;
    setCropConfirm(null);
    const remaining = cropPositionsAfterSkip(
      confirmation.positions,
      confirmation.existingPositions,
    );
    if (remaining.length === 0) {
      actions.setStatus(
        setUi,
        `Skipped ${confirmation.existingPositions.length} existing ROI output(s)`,
      );
      policy.onCropSkippedAll?.();
      return;
    }
    void runCrop(remaining, false);
  };

  const cancelCrop = async () => {
    const requestId = cropRequestIdForCancellation(ui().cropProgress);
    if (!requestId) return;
    actions.setCropProgress(setUi, await runClientEffect(backend.client.cancelCropRoi(requestId)));
  };

  return {
    state: ui,
    actions: sessionActions,
    meta: () => derived().meta,
    derived: () => {
      const { meta: _meta, ...rest } = derived();
      return rest;
    },
    saveCurrent,
    saveWithSmartExclusion,
    applySmartExclusion,
    crop: {
      confirm: cropConfirm,
      checkOverwrite: checkCropOverwrite,
      current: cropCurrent,
      saved: cropSaved,
      confirmOverwrite: confirmCropOverwrite,
      skipExisting: skipExistingCrop,
      cancelConfirm: () => setCropConfirm(null),
      cancel: cancelCrop,
    },
    variation: {
      preview: variationExcludePreview,
      loading: variationExcludeLoading,
      exclude: variationExclude,
      showPreview: (preview: AutoExcludePreviewResponse) => {
        setVariationExcludePreview({
          preview,
          threshold: preview.threshold,
        });
      },
      setThreshold: setVariationExcludeThreshold,
      dismiss: dismissVariationExcludePreview,
      cancel: cancelVariationExclude,
      apply: applyVariationExclude,
      autoExclude,
    },
  };
}

function frameLoadError(backend: AlignSessionBackend, cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message.startsWith("Frame request failed")
    ? backend.frameErrorMessage(cause)
    : backend.toErrorMessage(cause, fallback);
}

function sameFrameRequest(left: FrameRequest, right: FrameRequest): boolean {
  return (
    left.pos === right.pos &&
    left.channel === right.channel &&
    left.time === right.time &&
    left.z === right.z
  );
}

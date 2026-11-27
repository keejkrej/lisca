import type {
  AlignDrift,
  AlignGridPatternCoord,
  AlignGridShape,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  CropRoiProgress,
  FrameRequest,
  SavedAlignState,
  VariationExcludePreviewResponse,
  WorkspaceScan,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import {
  adjustAlignDriftTranslation,
  alignStateFromCurrent,
  applyDetectedAlignGrid,
  applyDisplayedAlignGridCommit,
  buildBboxCsv,
  clearAlignDriftKeyframe,
  clearAlignDriftPins,
  contrastForFrameChange,
  countVisibleAlignGridPatterns,
  detectGridReport,
  effectiveAlignGrid,
  enumerateVisibleAlignGridPatterns,
  initialVariationExcludeThreshold,
  isAlignDriftTranslationEditable,
  rebaseAlignDriftReference,
  setAlignDriftDelta,
  upsertAlignDriftKeyframe,
  computeVariationExcludePreview,
  type AlignGridPointerIntent,
  type AlignGridToolMode,
} from "@lisca/utils";
import { Effect } from "effect";
import type { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";

import {
  savedAlignStateKey,
  sourceKey,
  type AlignUiActions,
  type AlignUiAtom,
  type AlignUiState,
  type ExcludedByPosition,
  type StateUpdater,
} from "../atoms/align-ui";
import { resultData, resultFailureMessage, resultLoading } from "../atoms/result-utils";
import {
  createCanvasResourceTransaction,
  type CanvasResourceTransactionOptions,
} from "../canvas-resource-transaction";
import { toClientError, type ClientError } from "../infra/client-error";
import { runClientEffect } from "../infra/runtime";
import type { AlignerDataPort } from "../ports/types";
import {
  applyVariationExcludeWithEdge,
  cropPositionsAfterSkip,
  cropRequestIdForCancellation,
  deriveCurrentExcludedPatterns,
  deriveDisplayedExcludedPatterns,
  deriveVisibleCounts,
  isCropping,
  mergeEdgeAndVariationExcludedPatterns,
  runCropRoi,
  shouldApplySourceScan,
  updateVariationExcludeThreshold,
  type CropConfirmState,
  type VariationExcludePreview,
} from "./align-session";

export type { CropConfirmState, ExcludedByPosition, StateUpdater, VariationExcludePreview };

export type AlignSessionMeta = {
  scanLoading: boolean;
  frameLoading: boolean;
  saving: boolean;
  cropping: boolean;
};

export type AlignSessionStore = {
  atom: AlignUiAtom;
  actions: AlignUiActions;
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
  transact?: (<T>(options: CanvasResourceTransactionOptions<T>) => () => void) | undefined;
  transactContrast?: (<T>(options: CanvasResourceTransactionOptions<T>) => () => void) | undefined;
};

export type AlignWorkspaceSync = {
  getWorkspacePath: () => string | null;
  setWorkspacePath: (path: string | null) => void;
  getSourcePath: () => string | null;
  setSourcePath: (path: string | null) => void;
};

export type AlignSessionPolicy = {
  workspacePath?: (() => string | null) | undefined;
  source?: (() => AlignerSource | null) | undefined;
  selection?: ((state: AlignUiState) => FrameRequest) | undefined;
  canLoadFrame?: ((state: AlignUiState) => boolean) | undefined;
  preserveFrameOnContrastFailure?: boolean | undefined;
  enableCrop?: boolean | undefined;
  cropRequestPrefix?: string | undefined;
  onCropStarted?: ((event: { requestId: string; workspacePath: string }) => void) | undefined;
  onCropCompleted?: ((progress: CropRoiProgress) => void) | undefined;
  onCropSkippedAll?: (() => void) | undefined;
};

export type AlignState = {
  workspacePath: string | null;
  source: AlignerSource | null;
  setSource: (source: AlignerSource | null) => void;
  setWorkspacePath: (path: string | null) => void;
  scan: WorkspaceScan | null;
  scanLoading: boolean;
  frameLoading: boolean;
  error: string | null;
  selection: FrameRequest;
  setSelection: (patch: Partial<FrameRequest>) => void;
  contrast: ContrastWindow | null;
  setContrast: (contrast: ContrastWindow | null) => void;
  contrastLocked: boolean;
  setContrastLocked: (locked: boolean) => void;
  frame: FrameResult | null;
  grid: AlignGridState;
  drift: AlignDrift | null;
  effectiveGrid: AlignGridState;
  assayDefaultTime: number | null;
  setGrid: (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) => void;
  adjustTranslation: (dx: number, dy: number) => void;
  setDriftDelta: (dx: number, dy: number) => void;
  replaceDrift: (drift: AlignDrift | null) => void;
  commitCanvas: (
    preview: AlignGridState,
    intent: AlignGridPointerIntent,
    startGrid: AlignGridState,
  ) => void;
  setKeyframe: () => void;
  clearKeyframe: () => void;
  clearDrift: () => void;
  setReference: () => void;
  toolMode: AlignGridToolMode;
  setToolMode: (mode: AlignGridToolMode) => void;
  spacingZoomLocked: boolean;
  setSpacingZoomLocked: (locked: boolean) => void;
  patternZoomLocked: boolean;
  setPatternZoomLocked: (locked: boolean) => void;
  manualExclusionEnabled: boolean;
  setManualExclusionEnabled: (enabled: boolean) => void;
  excludedPatternsByPosition: ExcludedByPosition;
  setExcludedPatternsForCurrentPosition: (patterns: Iterable<AlignGridPatternCoord>) => void;
  currentExcludedPatterns: AlignGridPatternCoord[];
  displayedExcludedPatterns: AlignGridPatternCoord[];
  visibleCounts: {
    included: number;
    excluded: number;
  };
  saving: boolean;
  cropping: boolean;
  cropProgress: CropRoiProgress | null;
  cropConfirm: CropConfirmState | null;
  status: string | null;
  saveCurrent: (excludedPatterns?: Iterable<AlignGridPatternCoord>) => Promise<boolean>;
  cropCurrent: () => Promise<void>;
  cropBatch: () => Promise<void>;
  checkCropOverwrite: (positions: number[], kind?: CropConfirmState["kind"]) => Promise<void>;
  confirmCropOverwrite: () => void;
  skipExistingCrop: () => void;
  cancelCropConfirm: () => void;
  cancelCrop: () => Promise<void>;
  variationExcludePreview: VariationExcludePreview | null;
  variationExcludeLoading: boolean;
  variationExclude: () => Promise<void>;
  showVariationExcludePreview: (preview: VariationExcludePreviewResponse) => void;
  setVariationExcludeThreshold: (threshold: number) => void;
  dismissVariationExcludePreview: () => void;
  cancelVariationExclude: () => void;
  applyVariationExclude: () => void;
  excludeEdgeAndVariation: () => Promise<void>;
  reportError: (message: string | null) => void;
  reportStatus: (message: string | null) => void;
  detecting: boolean;
  detectReport: string | null;
  detectLowConfidence: boolean;
  detectGrid: (shape?: AlignGridShape) => Promise<void>;
};

export type AlignSessionControllerOptions = {
  registry: AtomRegistry.AtomRegistry;
  store: AlignSessionStore;
  backend: AlignSessionBackend;
  scan: AlignScanSource;
  resources?: AlignSessionResources | undefined;
  workspace?: AlignWorkspaceSync | undefined;
  policy?: AlignSessionPolicy | undefined;
  assayDefaultTime: () => number | null;
};

export type AlignSessionController = {
  getState: () => AlignState;
  subscribe: (listener: () => void) => () => void;
  syncExternal: () => void;
  dispose: () => void;
};

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

const contrastWindowKey = (window: ContrastWindow | null): string =>
  window == null ? "auto" : `${window.min}:${window.max}`;

export function createAlignSessionController(
  options: AlignSessionControllerOptions,
): AlignSessionController {
  const { registry, store, backend, scan, workspace } = options;
  const policy = options.policy ?? {};
  const actions = store.actions;

  const transactFrame = options.resources?.transact ?? createCanvasResourceTransaction();
  const transactContrast = options.resources?.transactContrast ?? createCanvasResourceTransaction();

  let cropConfirm: CropConfirmState | null = null;
  let variationExcludePreview: VariationExcludePreview | null = null;
  let variationExcludeLoading = false;
  let detecting = false;
  let detectReport: string | null = null;
  let detectLowConfidence = false;
  let stopCropProgress: () => void = () => {};

  let abortSelectionLoad: (() => void) | null = null;
  let abortContrastLoad: (() => void) | null = null;
  let pendingSelectionContrastKey: string | null = null;
  let contrastRevision = 0;
  let contrastInFlight = false;
  let selectionInFlight = false;
  let disposed = false;

  let lastFrameTriggerKey = "";
  let lastContrastKey = "";
  let subscribedScanKey: string | null = null;
  let unsubscribeScan: (() => void) | null = null;
  let currentScanResult: AsyncResult.AsyncResult<WorkspaceScan, unknown> = registry.get(scan.idle);

  const listeners = new Set<() => void>();
  let syncing = false;

  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const getUi = (): AlignUiState => registry.get(store.atom);

  const setUi = (update: StateUpdater<AlignUiState>) => {
    const current = registry.get(store.atom);
    const next = typeof update === "function" ? update(current) : update;
    if (next !== current) {
      registry.set(store.atom, next);
    }
  };

  const effectiveSelection = (state: AlignUiState): FrameRequest =>
    policy.selection?.(state) ?? state.selection;

  const isFrameLoadAllowed = (state: AlignUiState): boolean => policy.canLoadFrame?.(state) ?? true;

  const bindScanSubscription = () => {
    const key = sourceKey(getUi().source);
    if (key === subscribedScanKey && unsubscribeScan) return;
    unsubscribeScan?.();
    subscribedScanKey = key;
    const atom = key ? scan.forSource(key) : scan.idle;
    currentScanResult = registry.get(atom);
    unsubscribeScan = registry.subscribe(atom, (next) => {
      currentScanResult = next;
      reconcile();
    });
  };

  const triggerFrameLoad = (state: AlignUiState, selection: FrameRequest) => {
    abortSelectionLoad?.();
    abortSelectionLoad = null;
    abortContrastLoad?.();
    abortContrastLoad = null;
    contrastInFlight = false;

    const { source, scan: sourceScan, workspacePath } = state;
    if (!source || !sourceScan || !isFrameLoadAllowed(state)) {
      pendingSelectionContrastKey = null;
      selectionInFlight = false;
      actions.setFrameLoading(setUi, false);
      return;
    }

    const stateKey = workspacePath ? savedAlignStateKey(workspacePath, selection.pos) : null;
    const frameContrast = contrastForFrameChange(state.contrast, state.contrastLocked, state.frame);
    const selectionContrastRevision = contrastRevision;
    pendingSelectionContrastKey = frameContrast ? contrastWindowKey(frameContrast) : null;
    selectionInFlight = true;

    abortSelectionLoad = transactFrame({
      start: () => {
        actions.setContrast(setUi, frameContrast);
        actions.setFrameLoading(setUi, true);
        actions.setError(setUi, null);
        actions.setStatus(setUi, "Loading frame");
      },
      load: (signal) =>
        runClientEffect(
          Effect.all([
            backend.loadFrame(backend.client, source, selection, frameContrast),
            workspacePath
              ? backend.client.loadAlignState(workspacePath, selection.pos)
              : Effect.succeed(null as SavedAlignState | null),
          ]).pipe(Effect.mapError(toClientError)),
          { signal },
        ),
      commit: ([frame, saved]) => {
        const effectiveFrame =
          contrastRevision === selectionContrastRevision ? frame : (getUi().frame ?? frame);
        actions.applyLoadedFrame(
          setUi,
          selection,
          effectiveFrame,
          stateKey ? { stateKey, pos: selection.pos, saved } : null,
        );
      },
      reject: (cause) => {
        if (contrastRevision === selectionContrastRevision) {
          actions.setFrame(setUi, null);
        }
        actions.setError(
          setUi,
          frameLoadError(backend, cause, "Frame or saved align state load failed"),
        );
      },
      settle: () => {
        selectionInFlight = false;
        actions.setFrameLoading(setUi, contrastInFlight);
      },
    });
  };

  const triggerContrastLoad = (state: AlignUiState, selection: FrameRequest) => {
    const contrast = state.contrast;
    if (contrast == null) {
      pendingSelectionContrastKey = null;
      return;
    }
    const key = contrastWindowKey(contrast);
    if (pendingSelectionContrastKey === key) {
      pendingSelectionContrastKey = null;
      return;
    }
    pendingSelectionContrastKey = null;
    const { source, scan: sourceScan } = state;
    if (!source || !sourceScan || !isFrameLoadAllowed(state)) return;

    abortContrastLoad?.();
    contrastRevision += 1;
    contrastInFlight = true;
    const cleanup = transactContrast({
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
      settle: () => {
        contrastInFlight = false;
        actions.setFrameLoading(setUi, selectionInFlight);
      },
    });
    abortContrastLoad = cleanup;
  };

  const reconcile = () => {
    if (disposed || syncing) return;
    syncing = true;
    try {
      if (policy.workspacePath) {
        actions.setWorkspacePath(setUi, policy.workspacePath());
      }
      if (policy.source) {
        actions.setSource(setUi, policy.source());
      }
      if (workspace) {
        const current = getUi();
        const shellWorkspacePath = workspace.getWorkspacePath();
        if (shellWorkspacePath !== current.workspacePath) {
          if (shellWorkspacePath == null && current.workspacePath != null) {
            workspace.setWorkspacePath(current.workspacePath);
          } else {
            actions.setWorkspacePath(setUi, shellWorkspacePath);
          }
        }
        const sourcePath = getUi().source?.path ?? null;
        if (workspace.getSourcePath() !== sourcePath) {
          workspace.setSourcePath(sourcePath);
        }
      }

      bindScanSubscription();

      const afterBind = getUi();
      const activeKey = sourceKey(afterBind.source);
      if (afterBind.source && resultLoading(currentScanResult)) {
        if (!(afterBind.error === null && afterBind.status === "Scanning source")) {
          actions.setError(setUi, null);
          actions.setStatus(setUi, "Scanning source");
        }
      }

      const scanData = resultData(currentScanResult);
      if (scanData && activeKey && shouldApplySourceScan(getUi().scanSourceKey, activeKey)) {
        actions.applySourceScan(setUi, activeKey, scanData);
      }

      const scanErr = resultFailureMessage(currentScanResult);
      if (scanErr != null && scanErr !== "") {
        actions.setFrame(setUi, null);
        actions.setError(setUi, scanErr);
      }

      if (policy.selection) {
        const current = getUi();
        const effective = effectiveSelection(current);
        if (!sameFrameRequest(current.selection, effective)) {
          actions.setSelection(setUi, effective);
        }
      }

      const current = getUi();
      const selection = effectiveSelection(current);
      const frameTriggerKey = JSON.stringify([
        sourceKey(current.source),
        current.scanSourceKey,
        selection.pos,
        selection.channel,
        selection.time,
        selection.z,
        current.workspacePath,
        isFrameLoadAllowed(current),
      ]);
      if (frameTriggerKey !== lastFrameTriggerKey) {
        lastFrameTriggerKey = frameTriggerKey;
        lastContrastKey = contrastWindowKey(getUi().contrast);
        triggerFrameLoad(current, selection);
      } else {
        const nextContrastKey = contrastWindowKey(current.contrast);
        if (nextContrastKey !== lastContrastKey) {
          lastContrastKey = nextContrastKey;
          triggerContrastLoad(current, selection);
        }
      }
    } finally {
      syncing = false;
    }
    notify();
  };

  const unsubscribeUi = registry.subscribe(store.atom, () => {
    reconcile();
  });

  const setWorkspacePath = (path: string | null) => actions.setWorkspacePath(setUi, path);
  const setSource = (source: AlignerSource | null) => actions.setSource(setUi, source);
  const setSelection = (patch: Partial<FrameRequest>) => actions.setSelection(setUi, patch);
  const setContrast = (contrast: ContrastWindow | null) => actions.setContrast(setUi, contrast);
  const setContrastLocked = (locked: boolean) => actions.setContrastLocked(setUi, locked);
  const setGrid = (next: AlignGridState | ((current: AlignGridState) => AlignGridState)) =>
    actions.setGrid(setUi, next);
  const setToolMode = (mode: AlignGridToolMode) => actions.setToolMode(setUi, mode);
  const setSpacingZoomLocked = (locked: boolean) => actions.setSpacingZoomLocked(setUi, locked);
  const setPatternZoomLocked = (locked: boolean) => actions.setPatternZoomLocked(setUi, locked);
  const setManualExclusionEnabled = (enabled: boolean) =>
    actions.setManualExclusionEnabled(setUi, enabled);
  const setExcludedPatternsForCurrentPosition = (patterns: Iterable<AlignGridPatternCoord>) =>
    actions.setExcludedPatternsForPosition(setUi, effectiveSelection(getUi()).pos, patterns);
  const reportError = (message: string | null) => actions.setError(setUi, message);
  const reportStatus = (message: string | null) => actions.setStatus(setUi, message);

  const openVariationExcludePreview = (
    preview: VariationExcludePreviewResponse,
  ): VariationExcludePreview => ({
    preview,
    threshold: initialVariationExcludeThreshold(
      getUi().variationExcludeThreshold,
      preview.scoreMax,
    ),
  });

  const saveCurrent = async (excludedPatterns?: Iterable<AlignGridPatternCoord>) => {
    const currentUi = getUi();
    const selection = effectiveSelection(currentUi);
    const { workspacePath, frame, grid } = currentUi;
    if (!workspacePath || !frame) return false;
    const patterns = excludedPatterns
      ? Array.from(excludedPatterns)
      : deriveCurrentExcludedPatterns(currentUi.excludedPatternsByPosition, selection.pos);
    const poseTime = currentUi.drift?.referenceTime ?? selection.time;
    const poseGrid = effectiveAlignGrid(grid, currentUi.drift, poseTime);
    const { included } = countVisibleAlignGridPatterns(frame, poseGrid, patterns);
    if (included === 0) {
      actions.setError(setUi, "All grid patterns are excluded — adjust exclusions before saving.");
      return false;
    }
    actions.setSaving(setUi, true);
    actions.setError(setUi, null);
    try {
      if (excludedPatterns) actions.setExcludedPatternsForPosition(setUi, selection.pos, patterns);
      const result = await runClientEffect(
        backend.client.saveBbox(
          workspacePath,
          selection.pos,
          buildBboxCsv(frame, poseGrid, patterns),
          alignStateFromCurrent(grid, patterns, currentUi.drift, options.assayDefaultTime()),
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

  const previewVariationExclude = async () => {
    const currentUi = getUi();
    const { frame } = currentUi;
    if (!frame) return null;
    const patterns = enumerateVisibleAlignGridPatterns(
      frame,
      effectiveAlignGrid(currentUi.grid, currentUi.drift, effectiveSelection(currentUi).time),
    );
    if (patterns.length === 0) return null;
    variationExcludeLoading = true;
    notify();
    try {
      return computeVariationExcludePreview(frame, patterns);
    } finally {
      variationExcludeLoading = false;
      notify();
    }
  };

  const variationExclude = async () => {
    const currentUi = getUi();
    if (!currentUi.source || !currentUi.frame) return;
    reportStatus("Log-std exclude preview");
    try {
      const preview = await previewVariationExclude();
      if (!preview) {
        reportStatus("No visible patterns for log-std exclude");
        return;
      }
      variationExcludePreview = openVariationExcludePreview(preview);
      notify();
    } catch (cause) {
      reportError(backend.toErrorMessage(cause, "Log-std exclude preview failed"));
    }
  };

  const showVariationExcludePreview = (preview: VariationExcludePreviewResponse) => {
    variationExcludePreview = openVariationExcludePreview(preview);
    notify();
  };

  const setVariationExcludeThreshold = (threshold: number) => {
    variationExcludePreview = updateVariationExcludeThreshold(variationExcludePreview, threshold);
    actions.setVariationExcludeThreshold(setUi, threshold);
    notify();
  };

  const dismissVariationExcludePreview = () => {
    variationExcludePreview = null;
    notify();
  };

  const cancelVariationExclude = () => {
    if (!variationExcludePreview) return;
    variationExcludePreview = null;
    notify();
    reportStatus("Log-std exclude cancelled");
  };

  const applyVariationExclude = () => {
    const preview = variationExcludePreview;
    const currentUi = getUi();
    const { frame } = currentUi;
    if (!preview || !frame) return;
    const selection = effectiveSelection(currentUi);
    const currentExcludedPatterns = deriveCurrentExcludedPatterns(
      currentUi.excludedPatternsByPosition,
      selection.pos,
    );
    const applied = applyVariationExcludeWithEdge(
      currentExcludedPatterns,
      frame,
      effectiveAlignGrid(currentUi.grid, currentUi.drift, selection.time),
      preview,
    );
    setExcludedPatternsForCurrentPosition(applied.patterns);
    variationExcludePreview = null;
    notify();
    reportStatus(
      `Log-std excluded ${applied.variationPatterns.length} of ${applied.eligiblePatternCount} patterns`,
    );
  };

  const excludeEdgeAndVariation = async () => {
    const currentUi = getUi();
    const { source, frame } = currentUi;
    const selection = effectiveSelection(currentUi);
    const currentExcludedPatterns = deriveCurrentExcludedPatterns(
      currentUi.excludedPatternsByPosition,
      selection.pos,
    );
    if (!source || !frame) return;
    reportStatus("Edge and log-std exclude");
    try {
      const preview = await previewVariationExclude();
      const finalExcludedPatterns = mergeEdgeAndVariationExcludedPatterns(
        currentExcludedPatterns,
        frame,
        effectiveAlignGrid(currentUi.grid, currentUi.drift, selection.time),
        preview,
        preview?.threshold,
      );
      setExcludedPatternsForCurrentPosition(finalExcludedPatterns);
      reportStatus(
        `Edge and log-std excluded ${finalExcludedPatterns.length - currentExcludedPatterns.length} patterns`,
      );
    } catch (cause) {
      reportError(backend.toErrorMessage(cause, "Edge and log-std exclude failed"));
    }
  };

  const cropDisabledMessage =
    "ROI crop is not available in Aligner. Use Studio, lisca-crop, or the notebooks zip.";

  const runCrop = async (positions: number[], overwrite: boolean) => {
    if (policy.enableCrop === false) {
      actions.setStatus(setUi, cropDisabledMessage);
      return;
    }
    const { workspacePath, source } = getUi();
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
      onProgress: (progress) => actions.setCropProgress(setUi, progress),
      onError: (message) => actions.setError(setUi, message),
      onStarted: (startedId) => {
        policy.onCropStarted?.({ requestId: startedId, workspacePath });
      },
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
    const workspacePath = getUi().workspacePath;
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
        cropConfirm = { kind, positions, existingPositions };
        notify();
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
    const currentUi = getUi();
    if (!currentUi.workspacePath || !currentUi.source || !currentUi.frame) return;
    const position = effectiveSelection(currentUi).pos;
    if (!(await saveCurrent())) return;
    await checkCropOverwrite([position], "single");
  };

  const cropBatch = async () => {
    if (policy.enableCrop === false) {
      actions.setStatus(setUi, cropDisabledMessage);
      return;
    }
    const { workspacePath, source } = getUi();
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
    const confirmation = cropConfirm;
    if (!confirmation) return;
    cropConfirm = null;
    notify();
    void runCrop(confirmation.positions, true);
  };

  const skipExistingCrop = () => {
    const confirmation = cropConfirm;
    if (!confirmation || confirmation.kind !== "batch") return;
    cropConfirm = null;
    notify();
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

  const cancelCropConfirm = () => {
    cropConfirm = null;
    notify();
  };

  const cancelCrop = async () => {
    const requestId = cropRequestIdForCancellation(getUi().cropProgress);
    if (!requestId) return;
    actions.setCropProgress(setUi, await runClientEffect(backend.client.cancelCropRoi(requestId)));
  };

  const writeLattice = (next: { grid?: AlignGridState; drift?: AlignDrift | null }) => {
    actions.setLattice(setUi, next);
  };

  const detectGrid = async (shape?: AlignGridShape) => {
    const currentUi = getUi();
    const source = currentUi.source;
    if (!source || !currentUi.frame || detecting) return;
    const selection = effectiveSelection(currentUi);
    detecting = true;
    detectReport = null;
    detectLowConfidence = false;
    notify();
    actions.setError(setUi, null);
    actions.setStatus(setUi, "Detecting grid");
    try {
      const result = await runClientEffect(
        backend.client.detectGrid({
          source,
          request: selection,
          ...(shape ? { shape } : {}),
        }),
      );
      writeLattice({
        grid: applyDetectedAlignGrid(currentUi.grid, currentUi.drift, selection.time, result.grid),
      });
      setExcludedPatternsForCurrentPosition([]);
      const report = detectGridReport(result);
      detectReport = report.text;
      detectLowConfidence = report.lowConfidence;
      actions.setStatus(setUi, report.text);
    } catch (cause) {
      detectReport = null;
      detectLowConfidence = false;
      actions.setError(
        setUi,
        `${backend.toErrorMessage(cause, "Grid detection failed")} Place the grid by hand.`,
      );
    } finally {
      detecting = false;
      notify();
    }
  };

  const setDriftDelta = (dx: number, dy: number) => {
    const current = getUi();
    const next = setAlignDriftDelta(
      current.drift,
      effectiveSelection(current).time,
      options.assayDefaultTime(),
      dx,
      dy,
    );
    if (next === current.drift) return;
    writeLattice({ drift: next });
  };

  const adjustTranslation = (dx: number, dy: number) => {
    const current = getUi();
    const next = adjustAlignDriftTranslation(
      current.grid,
      current.drift,
      effectiveSelection(current).time,
      dx,
      dy,
    );
    if (next.grid === current.grid && next.drift === current.drift) return;
    writeLattice(next);
  };

  const replaceDrift = (drift: AlignDrift | null) => {
    writeLattice({ drift });
  };

  const setKeyframe = () => {
    const current = getUi();
    const next = upsertAlignDriftKeyframe(
      current.drift,
      effectiveSelection(current).time,
      options.assayDefaultTime(),
    );
    if (next === current.drift) return;
    writeLattice({ drift: next });
  };

  const clearKeyframe = () => {
    const current = getUi();
    const next = clearAlignDriftKeyframe(current.drift, effectiveSelection(current).time);
    if (next === current.drift) return;
    writeLattice({ drift: next });
  };

  const clearDrift = () => {
    const current = getUi();
    const next = clearAlignDriftPins(current.drift);
    if (next === current.drift) return;
    writeLattice({ drift: next });
  };

  const setReference = () => {
    const current = getUi();
    const next = rebaseAlignDriftReference(
      current.grid,
      current.drift,
      effectiveSelection(current).time,
    );
    if (next.grid === current.grid && next.drift === current.drift) return;
    writeLattice(next);
  };

  const commitCanvas = (
    preview: AlignGridState,
    intent: AlignGridPointerIntent,
    startGrid: AlignGridState,
  ) => {
    const current = getUi();
    const time = effectiveSelection(current).time;
    const next = applyDisplayedAlignGridCommit(
      current.grid,
      current.drift,
      time,
      preview,
      intent,
      startGrid,
    );
    if (next.grid === current.grid && next.drift === current.drift) {
      if (
        intent === "offset" &&
        (preview.tx !== startGrid.tx || preview.ty !== startGrid.ty) &&
        !isAlignDriftTranslationEditable(current.drift, time)
      ) {
        actions.setStatus(setUi, "Pin a keyframe in Drift to pan this frame");
      }
      return;
    }
    writeLattice(next);
  };

  const getState = (): AlignState => {
    const currentUi = getUi();
    const selection = effectiveSelection(currentUi);
    const scanLoading = currentUi.source != null && resultLoading(currentScanResult);
    const currentExcludedPatterns = deriveCurrentExcludedPatterns(
      currentUi.excludedPatternsByPosition,
      selection.pos,
    );
    const displayedExcludedPatterns = deriveDisplayedExcludedPatterns(
      currentUi.excludedPatternsByPosition,
      currentUi.loadedFrameSelection?.pos,
      selection.pos,
    );
    const visibleGrid = effectiveAlignGrid(currentUi.grid, currentUi.drift, selection.time);
    const visibleCounts = deriveVisibleCounts(
      currentUi.frame,
      visibleGrid,
      displayedExcludedPatterns,
    );
    const cropping = isCropping(currentUi.cropProgress);

    return {
      workspacePath: currentUi.workspacePath,
      source: currentUi.source,
      setSource,
      setWorkspacePath,
      scan: currentUi.scan,
      scanLoading,
      frameLoading: currentUi.frameLoading,
      error: currentUi.error,
      selection,
      setSelection,
      contrast: currentUi.contrast,
      setContrast,
      contrastLocked: currentUi.contrastLocked,
      setContrastLocked,
      frame: currentUi.frame,
      grid: currentUi.grid,
      drift: currentUi.drift,
      effectiveGrid: visibleGrid,
      assayDefaultTime: options.assayDefaultTime(),
      setGrid,
      adjustTranslation,
      setDriftDelta,
      replaceDrift,
      commitCanvas,
      setKeyframe,
      clearKeyframe,
      clearDrift,
      setReference,
      toolMode: currentUi.toolMode,
      setToolMode,
      spacingZoomLocked: currentUi.spacingZoomLocked,
      setSpacingZoomLocked,
      patternZoomLocked: currentUi.patternZoomLocked,
      setPatternZoomLocked,
      manualExclusionEnabled: currentUi.manualExclusionEnabled,
      setManualExclusionEnabled,
      excludedPatternsByPosition: currentUi.excludedPatternsByPosition,
      setExcludedPatternsForCurrentPosition,
      currentExcludedPatterns,
      displayedExcludedPatterns,
      visibleCounts,
      saving: currentUi.saving,
      cropping,
      cropProgress: currentUi.cropProgress,
      cropConfirm,
      status: currentUi.status,
      saveCurrent,
      cropCurrent,
      cropBatch,
      checkCropOverwrite,
      confirmCropOverwrite,
      skipExistingCrop,
      cancelCropConfirm,
      cancelCrop,
      variationExcludePreview,
      variationExcludeLoading,
      variationExclude,
      showVariationExcludePreview,
      setVariationExcludeThreshold,
      dismissVariationExcludePreview,
      cancelVariationExclude,
      applyVariationExclude,
      excludeEdgeAndVariation,
      reportError,
      reportStatus,
      detecting,
      detectReport,
      detectLowConfidence,
      detectGrid,
    };
  };

  // Run initial reconciliation synchronously.
  reconcile();

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncExternal: reconcile,
    dispose() {
      disposed = true;
      stopCropProgress();
      abortSelectionLoad?.();
      abortContrastLoad?.();
      unsubscribeScan?.();
      unsubscribeUi();
      listeners.clear();
    },
  };
}

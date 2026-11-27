import type {
  AnnotationLabel,
  RoiFrameRequest,
  RoiPositionScan,
  RoiWorkspaceScan,
} from "@lisca/contracts";
import {
  clamp,
  contrastForFrameChange,
  maskHasPixels,
  toolCanRunWithoutLabel,
  type FrameResult,
} from "@lisca/utils";
import { Effect } from "effect";
import type { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";

import type {
  AnnotatorUiActions,
  AnnotatorUiAtom,
  AnnotatorUiState,
  RoiSelection,
  StateUpdater,
} from "../atoms/annotator-ui";
import { currentPosition, currentRoi, requestKey } from "../atoms/annotator-ui";
import {
  resultData,
  resultFailureMessage,
  resultInFlight,
  resultLoading,
} from "../atoms/result-utils";
import {
  createCanvasResourceTransaction,
  type CanvasResourceTransactionOptions,
} from "../canvas-resource-transaction";
import type { DirtySelectionGuard } from "../hooks/annotate-selection-guard";
import { toClientError } from "../infra/client-error";
import { runClientEffect } from "../infra/runtime";
import type { AnnotatorDataPort } from "../ports/types";
import {
  annotationSessionErrorMessage,
  createAnnotationHistoryStore,
  emptyAnnotationValue,
  encodeMaskToBase64Png,
  loadRoiFrameEffect,
  loadRoiFrameWithAnnotationEffect,
  makeRoiFrameRequest,
  type AnnotationHistoryHandle,
  type AnnotationValue,
} from "./annotation-session";

export {
  AnnotationHistory,
  annotationOutputPaths,
  annotationSessionErrorMessage,
  annotationValuesEqual,
  clearRoiFrameCache,
  cloneAnnotationValue,
  createAnnotationHistoryStore,
  createRoiFrameLoader,
  decodeMaskBase64Png,
  emptyAnnotationValue,
  encodeMaskToBase64Png,
  loadRoiFrameEffect,
  loadRoiFrameWithAnnotationEffect,
  makeRoiFrameRequest,
} from "./annotation-session";
export type { AnnotationHistoryHandle, AnnotationValue, RoiSelection, StateUpdater };

export type AnnotateTimePreference = "first" | "last";

/**
 * Frame to show before the user picks one.
 * "first" leaves the stored index alone, clamped into the scan. "last" snaps
 * an untouched 0 to the final frame. Studio leaves this unset: Annotate walks
 * every frame and does not inherit Align's first or last frame.
 */
export function resolveAnnotateTimeIndex(input: {
  current: number;
  timeCount: number;
  preference: AnnotateTimePreference;
  timeChosen: boolean;
}): number {
  const max = Math.max(0, input.timeCount - 1);
  if (input.preference === "last" && !input.timeChosen && input.current === 0 && max > 0) {
    return max;
  }
  return clamp(input.current, 0, max);
}

export type AnnotateWorkspaceSync = {
  getWorkspacePath: () => string | null;
  setWorkspacePath: (path: string | null) => void;
};

export type AnnotateSessionCoreOptions<State extends AnnotatorUiState = AnnotatorUiState> = {
  getUi: () => State;
  setUi: (update: StateUpdater<State>) => void;
  actions: AnnotatorUiActions<State>;
  workspace: AnnotateWorkspaceSync;
  getScanResult: () => AsyncResult.AsyncResult<RoiWorkspaceScan, unknown> | undefined;
  getLabelsResult: () => AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown> | undefined;
  toErrorMessage: (cause: unknown, fallback: string) => string;
  initialTimeIndex?: AnnotateTimePreference | undefined;
};

export type AnnotateSessionCore<State extends AnnotatorUiState = AnnotatorUiState> = {
  sync: () => void;
  getState: () => State;
  getDerived: () => {
    scanLoading: boolean;
    scan: RoiWorkspaceScan | null;
    position: RoiPositionScan | null;
  };
  actions: {
    setSelection: (patch: Partial<RoiSelection>) => void;
    setContrast: (contrast: AnnotatorUiState["contrast"]) => void;
    setContrastLocked: (locked: boolean) => void;
    setMode: (mode: AnnotatorUiState["mode"]) => void;
    setTool: (tool: AnnotatorUiState["tool"]) => void;
    setBrushSize: (brushSize: number) => void;
    setOverlayOpacity: (overlayOpacity: number) => void;
    setActiveLabelId: (activeLabelId: string | null) => void;
    setLabelDialogOpen: (open: boolean) => void;
    setLabelError: (error: string | null) => void;
  };
};

export function createAnnotateSessionCore<State extends AnnotatorUiState>(
  options: AnnotateSessionCoreOptions<State>,
): AnnotateSessionCore<State> {
  const { getUi, setUi, actions, workspace, getScanResult, getLabelsResult, toErrorMessage } =
    options;
  const timePreference = options.initialTimeIndex ?? "first";

  let timeChosen = false;
  let trackedWorkspace = getUi().workspacePath;
  let lastAnnouncedScan: { path: string | null; data: RoiWorkspaceScan | undefined } = {
    path: null,
    data: undefined,
  };
  // Track the exact scan/labels results last processed by the error check so UI-only
  // mutations (e.g. committing a newly loaded frame) never re-wipe the frame while
  // labels remain in a failed state (Effect 5 regression).
  let lastCheckedScanResult: AsyncResult.AsyncResult<RoiWorkspaceScan, unknown> | undefined =
    undefined;
  let lastCheckedLabelsResult:
    | AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown>
    | undefined = undefined;
  let lastCheckedErrorWorkspace: string | null = null;

  const sessionActions: AnnotateSessionCore<State>["actions"] = {
    setSelection: (patch) => {
      if ("timeIndex" in patch) timeChosen = true;
      actions.setSelection(setUi, patch);
    },
    setContrast: (contrast) => actions.setContrast(setUi, contrast),
    setContrastLocked: (locked) => actions.setContrastLocked(setUi, locked),
    setMode: (mode) => actions.setMode(setUi, mode),
    setTool: (tool) => actions.setTool(setUi, tool),
    setBrushSize: (brushSize) => actions.setBrushSize(setUi, brushSize),
    setOverlayOpacity: (overlayOpacity) => actions.setOverlayOpacity(setUi, overlayOpacity),
    setActiveLabelId: (activeLabelId) => actions.setActiveLabelId(setUi, activeLabelId),
    setLabelDialogOpen: (open) => actions.setLabelDialogOpen(setUi, open),
    setLabelError: (error) => actions.setLabelError(setUi, error),
  };

  const sync = () => {
    const shellWorkspacePath = workspace.getWorkspacePath();
    const uiBefore = getUi();
    if (shellWorkspacePath !== uiBefore.workspacePath) {
      if (shellWorkspacePath == null && uiBefore.workspacePath != null) {
        workspace.setWorkspacePath(uiBefore.workspacePath);
      } else {
        actions.setWorkspacePath(setUi, shellWorkspacePath);
      }
    }

    const currentPath = getUi().workspacePath;
    if (currentPath !== trackedWorkspace) {
      trackedWorkspace = currentPath;
      timeChosen = false;
    }

    const scanResult = getScanResult();
    const labelsResult = getLabelsResult();
    const scanLoading = Boolean(
      shellWorkspacePath && (resultLoading(scanResult) || resultLoading(labelsResult)),
    );
    if (scanLoading) {
      actions.setScanError(setUi, null);
      actions.setStatus(setUi, "Scanning ROI workspace");
    }

    const scanData = resultData(scanResult);
    if (
      scanData &&
      getUi().workspacePath === shellWorkspacePath &&
      (lastAnnouncedScan.path !== shellWorkspacePath || lastAnnouncedScan.data !== scanData)
    ) {
      lastAnnouncedScan = { path: shellWorkspacePath, data: scanData };
      actions.setStatus(setUi, "ROI workspace loaded");
    }

    if (getUi().workspacePath === shellWorkspacePath) {
      const labels = resultData(labelsResult);
      if (labels && labels.length > 0) {
        actions.syncActiveLabelFromLabels(
          setUi,
          labels.map((label) => label.id),
        );
      }
    }

    if (
      scanResult !== lastCheckedScanResult ||
      labelsResult !== lastCheckedLabelsResult ||
      shellWorkspacePath !== lastCheckedErrorWorkspace
    ) {
      lastCheckedScanResult = scanResult;
      lastCheckedLabelsResult = labelsResult;
      lastCheckedErrorWorkspace = shellWorkspacePath;
      if (getUi().workspacePath === shellWorkspacePath) {
        const scanLoadError = resultFailureMessage(scanResult);
        const labelsLoadError = resultFailureMessage(labelsResult);
        const error = scanLoadError ?? labelsLoadError;
        if (error) {
          actions.setFrame(setUi, null);
          actions.setScanError(setUi, toErrorMessage(error, "ROI workspace load failed"));
        }
      }
    }

    const firstPosition = scanData?.positions[0] ?? null;
    const uiAfterScan = getUi();
    if (!firstPosition) {
      if (
        uiAfterScan.selection.pos !== null ||
        uiAfterScan.selection.roi !== null ||
        uiAfterScan.selection.channel !== null ||
        uiAfterScan.selection.timeIndex !== 0 ||
        uiAfterScan.selection.zIndex !== 0
      ) {
        actions.setSelection(setUi, {
          pos: null,
          roi: null,
          channel: null,
          timeIndex: 0,
          zIndex: 0,
        });
      }
      return;
    }

    if (!scanData?.positions.some((entry) => entry.pos === uiAfterScan.selection.pos)) {
      actions.setSelection(setUi, { pos: firstPosition.pos });
    }

    const uiForPos = getUi();
    const position = currentPosition(scanData ?? null, uiForPos.selection.pos);
    if (!position) return;
    const patch = {
      channel: position.channels.includes(uiForPos.selection.channel ?? Number.NaN)
        ? uiForPos.selection.channel
        : (position.channels[0] ?? null),
      roi: position.rois.some((entry) => entry.roi === uiForPos.selection.roi)
        ? uiForPos.selection.roi
        : (position.rois[0]?.roi ?? null),
      timeIndex: resolveAnnotateTimeIndex({
        current: uiForPos.selection.timeIndex,
        timeCount: position.times.length,
        preference: timePreference,
        timeChosen,
      }),
      zIndex: clamp(uiForPos.selection.zIndex, 0, Math.max(0, position.zSlices.length - 1)),
    };
    if (
      patch.channel !== uiForPos.selection.channel ||
      patch.roi !== uiForPos.selection.roi ||
      patch.timeIndex !== uiForPos.selection.timeIndex ||
      patch.zIndex !== uiForPos.selection.zIndex
    ) {
      actions.setSelection(setUi, patch);
    }
  };

  const getDerived = () => {
    const currentUi = getUi();
    const shellWorkspacePath = workspace.getWorkspacePath();
    const scanResult = getScanResult();
    const labelsResult = getLabelsResult();
    const scanLoading = Boolean(
      shellWorkspacePath && (resultLoading(scanResult) || resultLoading(labelsResult)),
    );
    const scanData = resultData(scanResult);
    const position = currentPosition(scanData ?? null, currentUi.selection.pos);
    return {
      scanLoading,
      scan: scanData ?? null,
      position,
    };
  };

  return {
    sync,
    getState: getUi,
    getDerived,
    actions: sessionActions,
  };
}

export type AnnotateState = {
  workspacePath: string | null;
  scan: RoiWorkspaceScan | null;
  labels: AnnotationLabel[];
  selection: RoiSelection;
  activeLabelId: string | null;
  mode: AnnotatorUiState["mode"];
  tool: AnnotatorUiState["tool"];
  brushSize: number;
  overlayOpacity: number;
  frame: FrameResult | null;
  contrast: AnnotatorUiState["contrast"];
  contrastLocked: boolean;
  contrastDomain: AnnotatorUiState["contrastDomain"];
  contrastMin: number;
  contrastMax: number;
  scanLoading: boolean;
  frameLoading: boolean;
  annotationLoading: boolean;
  saving: boolean;
  scanError: string | null;
  frameError: string | null;
  annotationError: string | null;
  saveError: string | null;
  labelError: string | null;
  labelDialogOpen: boolean;
  filePickerOpen: boolean;
  position: RoiPositionScan | null;
  request: RoiFrameRequest | null;
  annotation: AnnotationHistoryHandle;
  canEdit: boolean;
  canEditSegmentation: boolean;
  canSave: boolean;
  canvasToasts: Array<{ text: string; tone?: "error" | undefined }>;
  setFilePickerOpen: (open: boolean) => void;
  setLabelDialogOpen: (open: boolean) => void;
  setLabelError: (error: string | null) => void;
  setSelection: (patch: Partial<RoiSelection>) => void;
  setContrast: (contrast: AnnotatorUiState["contrast"]) => void;
  setContrastLocked: (locked: boolean) => void;
  setMode: (mode: AnnotatorUiState["mode"]) => void;
  setTool: (tool: AnnotatorUiState["tool"]) => void;
  setBrushSize: (brushSize: number) => void;
  setOverlayOpacity: (overlayOpacity: number) => void;
  setActiveLabelId: (activeLabelId: string | null) => void;
  changeSelection: (fn: () => void) => void;
  handleSave: () => Promise<void>;
  handleSaveLabels: (nextLabels: AnnotationLabel[]) => Promise<void>;
  saveLabelsPending: boolean;
  pickWorkspace: (path: string) => void;
};

export type AnnotateSessionControllerOptions<State extends AnnotatorUiState = AnnotatorUiState> = {
  registry: AtomRegistry.AtomRegistry;
  annotatorClient: AnnotatorDataPort;
  toErrorMessage: (cause: unknown, fallback: string) => string;
  annotatorUiAtom: AnnotatorUiAtom<State>;
  annotatorUiActions: AnnotatorUiActions<State>;
  roiWorkspaceScanAtom: (
    workspacePath: string,
  ) => Atom.Atom<AsyncResult.AsyncResult<RoiWorkspaceScan, unknown>>;
  roiScanIdleAtom: Atom.Atom<AsyncResult.AsyncResult<RoiWorkspaceScan, unknown>>;
  annotationLabelsAtom: (
    workspacePath: string,
  ) => Atom.Atom<AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown>>;
  labelsIdleAtom: Atom.Atom<AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown>>;
  saveAnnotationLabelsAtom: Atom.AtomResultFn<
    {
      workspacePath: string;
      labels: AnnotationLabel[];
    },
    readonly AnnotationLabel[],
    unknown
  >;
  saveRoiFrameAnnotationAtom: Atom.AtomResultFn<
    {
      workspacePath: string;
      request: RoiFrameRequest;
      annotation: {
        classificationLabelId: string | null;
        maskBase64Png: string | null;
      };
    },
    unknown,
    unknown
  >;
  workspace: AnnotateWorkspaceSync;
  guardDirtySelection: DirtySelectionGuard;
  initialTimeIndex?: AnnotateTimePreference | undefined;
  transact?: (<T>(options: CanvasResourceTransactionOptions<T>) => () => void) | undefined;
  transientStatusMs?: number | undefined;
};

export type AnnotateSessionController = {
  getState: () => AnnotateState;
  subscribe: (listener: () => void) => () => void;
  syncExternal: () => void;
  dispose: () => void;
};

const contrastWindowKey = (window: { min: number; max: number } | null): string =>
  window == null ? "auto" : `${window.min}:${window.max}`;

export function createAnnotateSessionController<State extends AnnotatorUiState>(
  deps: AnnotateSessionControllerOptions<State>,
): AnnotateSessionController {
  const { registry, workspace } = deps;
  const loadSelectionResources = deps.transact ?? createCanvasResourceTransaction();
  const loadContrastResources = deps.transact ?? createCanvasResourceTransaction();

  let filePickerOpen = false;
  let selectionChanging = false;
  let abortSelectionLoad: (() => void) | null = null;
  let abortContrastLoad: (() => void) | null = null;
  let pendingSelectionContrastKey: string | null = null;
  let contrastRevision = 0;
  let contrastInFlight = false;
  let disposed = false;
  let syncing = false;

  let subscribedWorkspacePath: string | null | undefined = undefined;
  let unsubscribeScan: (() => void) | null = null;
  let unsubscribeLabels: (() => void) | null = null;
  let currentScanResult: AsyncResult.AsyncResult<RoiWorkspaceScan, unknown> = registry.get(
    deps.roiScanIdleAtom,
  );
  let currentLabelsResult: AsyncResult.AsyncResult<readonly AnnotationLabel[], unknown> =
    registry.get(deps.labelsIdleAtom);
  let currentSaveLabelsResult = registry.get(deps.saveAnnotationLabelsAtom);

  let lastFrameTriggerKey = "";
  let lastContrastKey = "";
  let transientStatus: string | null = null;
  let lastRawStatus: string | null = null;
  let transientTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  const transientMs = deps.transientStatusMs ?? 2400;

  const listeners = new Set<() => void>();
  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const getUi = (): State => registry.get(deps.annotatorUiAtom);
  const setUi = (update: StateUpdater<State>) => {
    const current = registry.get(deps.annotatorUiAtom);
    const next = typeof update === "function" ? update(current) : update;
    if (next !== current) {
      registry.set(deps.annotatorUiAtom, next);
    }
  };

  const annotation = createAnnotationHistoryStore();
  const unsubscribeHistory = annotation.subscribe(notify);

  const session = createAnnotateSessionCore({
    getUi,
    setUi,
    actions: deps.annotatorUiActions,
    workspace,
    getScanResult: () => currentScanResult,
    getLabelsResult: () => currentLabelsResult,
    toErrorMessage: deps.toErrorMessage,
    initialTimeIndex: deps.initialTimeIndex,
  });

  const bindWorkspaceAtoms = () => {
    const path = workspace.getWorkspacePath();
    if (path === subscribedWorkspacePath && unsubscribeScan && unsubscribeLabels) return;
    unsubscribeScan?.();
    unsubscribeLabels?.();
    subscribedWorkspacePath = path;
    const scanAtom = path ? deps.roiWorkspaceScanAtom(path) : deps.roiScanIdleAtom;
    const labelsAtom = path ? deps.annotationLabelsAtom(path) : deps.labelsIdleAtom;
    currentScanResult = registry.get(scanAtom);
    currentLabelsResult = registry.get(labelsAtom);
    unsubscribeScan = registry.subscribe(scanAtom, (next) => {
      currentScanResult = next;
      reconcile();
    });
    unsubscribeLabels = registry.subscribe(labelsAtom, (next) => {
      currentLabelsResult = next;
      reconcile();
    });
  };

  const computeRequestContext = () => {
    const currentUi = getUi();
    const labels = [...(resultData(currentLabelsResult) ?? [])];
    const position = session.getDerived().position;
    const selectedRoi = currentRoi(position, currentUi.selection.roi);
    const request = makeRoiFrameRequest(
      position,
      selectedRoi,
      currentUi.selection.channel,
      currentUi.selection.timeIndex,
      currentUi.selection.zIndex,
    );
    return {
      labels,
      position,
      selectedRoi,
      request,
      activeRequestKey: requestKey(position, selectedRoi, currentUi.selection),
    };
  };

  const syncTransientStatus = (raw: string | null) => {
    if (raw === lastRawStatus) return;
    lastRawStatus = raw;
    if (transientTimer !== undefined) {
      globalThis.clearTimeout(transientTimer);
      transientTimer = undefined;
    }
    transientStatus = raw;
    if (raw && transientMs > 0) {
      transientTimer = globalThis.setTimeout(() => {
        transientTimer = undefined;
        transientStatus = null;
        notify();
      }, transientMs);
    }
  };

  const triggerSelectionLoad = (
    workspacePath: string | null,
    shellPath: string | null,
    request: RoiFrameRequest | null,
  ) => {
    abortSelectionLoad?.();
    abortSelectionLoad = null;
    abortContrastLoad?.();
    abortContrastLoad = null;
    contrastInFlight = false;

    if (!workspacePath || workspacePath !== shellPath || !request) {
      pendingSelectionContrastKey = null;
      deps.annotatorUiActions.setFrame(setUi, null);
      annotation.reset(emptyAnnotationValue(null));
      deps.annotatorUiActions.setFrameLoading(setUi, false);
      deps.annotatorUiActions.setAnnotationLoading(setUi, false);
      return;
    }

    const current = getUi();
    const frameContrast = contrastForFrameChange(
      current.contrast,
      current.contrastLocked,
      current.frame,
    );
    const selectionContrastRevision = contrastRevision;
    pendingSelectionContrastKey = frameContrast ? contrastWindowKey(frameContrast) : null;

    abortSelectionLoad = loadSelectionResources<{
      frame: FrameResult;
      annotation: { classificationLabelId: string | null; mask: Uint8Array };
    }>({
      start: () => {
        deps.annotatorUiActions.setContrast(setUi, frameContrast);
        deps.annotatorUiActions.setFrameLoading(setUi, true);
        deps.annotatorUiActions.setAnnotationLoading(setUi, true);
        deps.annotatorUiActions.setFrameError(setUi, null);
        deps.annotatorUiActions.setAnnotationError(setUi, null);
        deps.annotatorUiActions.setStatus(setUi, "Loading ROI frame");
      },
      load: (signal) =>
        runClientEffect(
          loadRoiFrameWithAnnotationEffect(
            deps.annotatorClient,
            workspacePath,
            request,
            frameContrast,
          ).pipe(Effect.mapError(toClientError)),
          { signal },
        ),
      commit: ({ frame: nextFrame, annotation: nextAnnotation }) => {
        annotation.reset(nextAnnotation);
        if (contrastRevision === selectionContrastRevision) {
          deps.annotatorUiActions.setFrame(setUi, nextFrame);
          deps.annotatorUiActions.setContrastState(setUi, nextFrame);
        }
        deps.annotatorUiActions.setStatus(setUi, `Loaded Pos${request.pos} Roi${request.roi}`);
      },
      reject: (cause) => {
        if (contrastRevision === selectionContrastRevision) {
          deps.annotatorUiActions.setFrame(setUi, null);
        }
        annotation.reset(emptyAnnotationValue(null));
        deps.annotatorUiActions.setFrameError(
          setUi,
          annotationSessionErrorMessage(cause, "ROI frame and annotation request failed"),
        );
      },
      settle: () => {
        deps.annotatorUiActions.setFrameLoading(setUi, contrastInFlight);
        deps.annotatorUiActions.setAnnotationLoading(setUi, false);
      },
    });
  };

  const triggerContrastLoad = (
    workspacePath: string | null,
    shellPath: string | null,
    request: RoiFrameRequest | null,
    contrast: AnnotatorUiState["contrast"],
  ) => {
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
    if (!workspacePath || workspacePath !== shellPath || !request) return;

    abortContrastLoad?.();
    contrastRevision += 1;
    contrastInFlight = true;
    abortContrastLoad = loadContrastResources({
      start: () => {
        deps.annotatorUiActions.setFrameLoading(setUi, true);
        deps.annotatorUiActions.setFrameError(setUi, null);
      },
      load: (signal) =>
        runClientEffect(
          loadRoiFrameEffect(deps.annotatorClient, workspacePath, request, contrast).pipe(
            Effect.mapError(toClientError),
          ),
          { signal },
        ),
      commit: (nextFrame) => {
        deps.annotatorUiActions.setFrame(setUi, nextFrame);
        deps.annotatorUiActions.setContrastState(setUi, nextFrame);
      },
      reject: (cause) => {
        deps.annotatorUiActions.setFrameError(
          setUi,
          annotationSessionErrorMessage(cause, "ROI frame contrast update failed"),
        );
      },
      settle: () => {
        contrastInFlight = false;
        deps.annotatorUiActions.setFrameLoading(setUi, getUi().annotationLoading);
      },
    });
  };

  const reconcile = () => {
    if (disposed || syncing) return;
    syncing = true;
    try {
      bindWorkspaceAtoms();
      session.sync();

      const currentUi = getUi();
      syncTransientStatus(currentUi.status);

      const shellPath = workspace.getWorkspacePath();
      const context = computeRequestContext();
      const frameTriggerKey = `${shellPath ?? ""}::${context.activeRequestKey}`;
      if (frameTriggerKey !== lastFrameTriggerKey) {
        lastFrameTriggerKey = frameTriggerKey;
        lastContrastKey = contrastWindowKey(getUi().contrast);
        triggerSelectionLoad(currentUi.workspacePath, shellPath, context.request);
      } else {
        const nextContrastKey = contrastWindowKey(currentUi.contrast);
        if (nextContrastKey !== lastContrastKey) {
          lastContrastKey = nextContrastKey;
          triggerContrastLoad(
            currentUi.workspacePath,
            shellPath,
            context.request,
            currentUi.contrast,
          );
        }
      }
    } finally {
      syncing = false;
    }
    notify();
  };

  const unsubscribeUi = registry.subscribe(deps.annotatorUiAtom, () => {
    reconcile();
  });
  const unsubscribeSaveLabels = registry.subscribe(deps.saveAnnotationLabelsAtom, (next) => {
    currentSaveLabelsResult = next;
    notify();
  });

  const runAtomFn = <Arg, Value>(
    atom: Atom.AtomResultFn<Arg, Value, unknown>,
    arg: Arg,
  ): Promise<Value> =>
    new Promise<Value>((resolve, reject) => {
      let settled = false;
      const unsub = registry.subscribe(atom, (result) => {
        if (settled || result._tag === "Initial" || result.waiting) return;
        settled = true;
        unsub();
        if (result._tag === "Success") {
          resolve(result.value);
        } else {
          reject(result.cause);
        }
      });
      registry.set(atom, arg);
    });

  const handleSave = async () => {
    const currentUi = getUi();
    const shellPath = workspace.getWorkspacePath();
    const context = computeRequestContext();
    const request = context.request;
    const labels = context.labels;
    const canEdit =
      Boolean(currentUi.frame && request && labels.length > 0) &&
      !currentUi.frameLoading &&
      !currentUi.annotationLoading &&
      !session.getDerived().scanLoading;
    const canSave = canEdit && annotation.dirty && !currentUi.saving;
    if (!shellPath || !request || !currentUi.frame || !canSave) return;
    deps.annotatorUiActions.setSaving(setUi, true);
    deps.annotatorUiActions.setSaveError(setUi, null);
    try {
      const segmentationMask = maskHasPixels(annotation.current.mask);
      await runAtomFn(deps.saveRoiFrameAnnotationAtom, {
        workspacePath: shellPath,
        request,
        annotation: {
          classificationLabelId: annotation.current.classificationLabelId,
          maskBase64Png: segmentationMask
            ? await encodeMaskToBase64Png(
                annotation.current.mask,
                currentUi.frame.width,
                currentUi.frame.height,
              )
            : null,
        },
      });
      annotation.markSaved();
      deps.annotatorUiActions.setStatus(setUi, "Saved ROI annotation");
    } catch (cause) {
      deps.annotatorUiActions.setSaveError(
        setUi,
        deps.toErrorMessage(cause, "ROI annotation save failed"),
      );
    } finally {
      deps.annotatorUiActions.setSaving(setUi, false);
    }
  };

  const handleSaveLabels = async (nextLabels: AnnotationLabel[]) => {
    const shellPath = workspace.getWorkspacePath();
    if (!shellPath) {
      session.actions.setLabelError("Select a workspace first.");
      return;
    }
    session.actions.setLabelError(null);
    try {
      const savedLabels = await runAtomFn(deps.saveAnnotationLabelsAtom, {
        workspacePath: shellPath,
        labels: nextLabels,
      });
      deps.annotatorUiActions.applySavedLabels(setUi, savedLabels);
      deps.annotatorUiActions.setStatus(setUi, "Saved labels");
    } catch (cause) {
      session.actions.setLabelError(deps.toErrorMessage(cause, "Annotation labels save failed"));
    }
  };

  const setFilePickerOpen = (open: boolean) => {
    filePickerOpen = open;
    notify();
  };

  const pickWorkspace = (path: string) => {
    workspace.setWorkspacePath(path);
    filePickerOpen = false;
    reconcile();
  };

  const applySelectionChange = (fn: () => void) => {
    selectionChanging = true;
    try {
      fn();
    } finally {
      globalThis.setTimeout(() => {
        selectionChanging = false;
      }, 0);
    }
  };

  const changeSelection = (fn: () => void) => {
    const guard = deps.guardDirtySelection(annotation.dirty, selectionChanging);
    if (typeof guard === "boolean") {
      if (!guard) return;
      applySelectionChange(fn);
      return;
    }
    void (async () => {
      const allowed = await guard;
      if (!allowed) return;
      applySelectionChange(fn);
    })();
  };

  const getState = (): AnnotateState => {
    const currentUi = getUi();
    const derived = session.getDerived();
    const context = computeRequestContext();
    const labels = context.labels;
    const activeLabelValue = labels.findIndex((label) => label.id === currentUi.activeLabelId) + 1;
    const canEdit =
      Boolean(currentUi.frame && context.request && labels.length > 0) &&
      !currentUi.frameLoading &&
      !currentUi.annotationLoading &&
      !derived.scanLoading;
    const toolCanRunWithoutLabelValue = toolCanRunWithoutLabel(currentUi.tool);
    const canEditSegmentation =
      canEdit &&
      currentUi.mode === "segmentation" &&
      (activeLabelValue > 0 || toolCanRunWithoutLabelValue);
    const canSave = canEdit && annotation.dirty && !currentUi.saving;
    const activeError =
      currentUi.scanError ??
      currentUi.frameError ??
      currentUi.annotationError ??
      currentUi.saveError;
    const saveLabelsPending = resultInFlight(currentSaveLabelsResult);
    const activeToastStatus = currentUi.frameLoading
      ? "Loading ROI frame"
      : currentUi.annotationLoading
        ? "Loading ROI annotation"
        : derived.scanLoading
          ? "Scanning ROI workspace"
          : transientStatus;
    const canvasToasts: Array<{ text: string; tone?: "error" | undefined }> = activeError
      ? [{ text: activeError, tone: "error" }]
      : activeToastStatus
        ? [{ text: activeToastStatus }]
        : [];

    return {
      workspacePath: currentUi.workspacePath,
      scan: derived.scan,
      labels,
      selection: currentUi.selection,
      activeLabelId: currentUi.activeLabelId,
      mode: currentUi.mode,
      tool: currentUi.tool,
      brushSize: currentUi.brushSize,
      overlayOpacity: currentUi.overlayOpacity,
      frame: currentUi.frame,
      contrast: currentUi.contrast,
      contrastLocked: currentUi.contrastLocked,
      contrastDomain: currentUi.contrastDomain,
      contrastMin: currentUi.contrastMin,
      contrastMax: currentUi.contrastMax,
      scanLoading: derived.scanLoading,
      frameLoading: currentUi.frameLoading,
      annotationLoading: currentUi.annotationLoading,
      saving: currentUi.saving,
      scanError: currentUi.scanError,
      frameError: currentUi.frameError,
      annotationError: currentUi.annotationError,
      saveError: currentUi.saveError,
      labelError: currentUi.labelError,
      labelDialogOpen: currentUi.labelDialogOpen,
      filePickerOpen,
      position: derived.position,
      request: context.request,
      annotation,
      canEdit,
      canEditSegmentation,
      canSave,
      canvasToasts,
      setFilePickerOpen,
      setLabelDialogOpen: session.actions.setLabelDialogOpen,
      setLabelError: session.actions.setLabelError,
      setSelection: session.actions.setSelection,
      setContrast: session.actions.setContrast,
      setContrastLocked: session.actions.setContrastLocked,
      setMode: session.actions.setMode,
      setTool: session.actions.setTool,
      setBrushSize: session.actions.setBrushSize,
      setOverlayOpacity: session.actions.setOverlayOpacity,
      setActiveLabelId: session.actions.setActiveLabelId,
      changeSelection,
      handleSave,
      handleSaveLabels,
      saveLabelsPending,
      pickWorkspace,
    };
  };

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
      if (transientTimer !== undefined) globalThis.clearTimeout(transientTimer);
      abortSelectionLoad?.();
      abortContrastLoad?.();
      unsubscribeScan?.();
      unsubscribeLabels?.();
      unsubscribeUi();
      unsubscribeSaveLabels();
      unsubscribeHistory();
      listeners.clear();
    },
  };
}

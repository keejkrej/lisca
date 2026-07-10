import type {
  AnnotationLabel,
  RoiFrameRequest,
  RoiIndexEntry,
  RoiPositionScan,
} from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { resultData, resultLoading } from "../atoms/result-utils";
import {
  useAnnotateSessionCore,
  type AnnotateWorkspaceSync,
} from "../session/use-annotate-session";
import { runClientEffect } from "../infra/runtime";
import type { CanvasResourceTransactionOptions } from "../canvas-resource-transaction";
import type {
  AnnotatorUiActions,
  AnnotatorUiAtom,
  AnnotatorUiState,
  RoiSelection,
  StateUpdater,
} from "../atoms/annotator-ui";
import { toolCanRunWithoutLabel } from "@lisca/ui-headless/annotation-tools";
import { toClientError } from "../infra/client-error";
import {
  frameLoadRequest,
  shouldResetContrastBeforeNavigationLoad,
  shouldRunContrastFrameLoad,
} from "../session/frame-load-policy";
import type { AnnotatorDataPort } from "../ports/types";
import type { Atom, Result } from "@effect-atom/atom-solid";
import { RegistryContext, useAtom, useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
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
import type { DirtySelectionGuard } from "./annotate-selection-guard";

export type AnnotationHistoryHandle = {
  current: {
    classificationLabelId: string | null;
    mask: Uint8Array;
  };
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  reset: (value: { classificationLabelId: string | null; mask: Uint8Array }) => void;
  commit: (value: { classificationLabelId: string | null; mask: Uint8Array }) => void;
  undo: () => void;
  redo: () => void;
  discard: () => void;
  markSaved: () => void;
};

export type UseAnnotateStateCoreDeps = {
  annotatorClient: AnnotatorDataPort;
  toErrorMessage: (cause: unknown, fallback: string) => string;
  effectErrorMessage: (cause: unknown, fallback: string) => string;
  loadRoiFrameWithAnnotationEffect: (
    backend: AnnotatorDataPort,
    workspacePath: string,
    request: RoiFrameRequest,
    contrast: AnnotatorUiState["contrast"],
  ) => import("effect").Effect.Effect<
    {
      frame: FrameResult;
      annotation: {
        classificationLabelId: string | null;
        mask: Uint8Array;
      };
    },
    import("../infra/client-error.ts").ClientError
  >;
  loadRoiFrameEffect: (
    backend: AnnotatorDataPort,
    workspacePath: string,
    request: RoiFrameRequest,
    contrast: AnnotatorUiState["contrast"],
  ) => import("effect").Effect.Effect<FrameResult, import("../infra/client-error.ts").ClientError>;
  annotatorUiAtom: AnnotatorUiAtom;
  annotatorUiActions: AnnotatorUiActions;
  roiWorkspaceScanAtom: (
    workspacePath: string,
  ) => Atom.Atom<Result.Result<import("@lisca/contracts").RoiWorkspaceScan, unknown>>;
  roiScanIdleAtom: Atom.Atom<Result.Result<import("@lisca/contracts").RoiWorkspaceScan, unknown>>;
  annotationLabelsAtom: (
    workspacePath: string,
  ) => Atom.Atom<Result.Result<readonly AnnotationLabel[], unknown>>;
  labelsIdleAtom: Atom.Atom<Result.Result<readonly AnnotationLabel[], unknown>>;
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
  useShellWorkspace: () => AnnotateWorkspaceSync;
  useCanvasResourceTransaction: () => <T>(
    options: CanvasResourceTransactionOptions<T>,
  ) => () => void;
  useCanvasTransientStatus: (status: Accessor<string | null>) => Accessor<string | null>;
  guardDirtySelection: DirtySelectionGuard;
  useAnnotationHistory: (frame: FrameResult | null) => AnnotationHistoryHandle;
  emptyValueFor: (frame: FrameResult | null) => {
    classificationLabelId: string | null;
    mask: Uint8Array;
  };
  makeRequest: (
    position: RoiPositionScan | null,
    selectedRoi: RoiIndexEntry | null,
    channel: number | null,
    timeIndex: number,
    zIndex: number,
  ) => RoiFrameRequest | null;
  currentRoi: (position: RoiPositionScan | null, roi: number | null) => RoiIndexEntry | null;
  requestKey: (
    position: RoiPositionScan | null,
    roi: RoiIndexEntry | null,
    selection: RoiSelection,
  ) => string;
  roiRequestSelectionKey: (selection: RoiSelection) => string;
  encodeMaskToBase64Png: (mask: Uint8Array, width: number, height: number) => Promise<string>;
  maskHasPixels: (mask: Uint8Array) => boolean;
};

export function useAnnotateStateCore(deps: UseAnnotateStateCoreDeps) {
  const workspace = deps.useShellWorkspace();
  const shellWorkspacePath = () => workspace.workspacePath;
  const [filePickerOpen, setFilePickerOpen] = createSignal(false);
  const [ui, setUi] = useAtom(deps.annotatorUiAtom);
  const scanResult = useSelectedAtomValue(() => {
    const path = shellWorkspacePath();
    return path ? deps.roiWorkspaceScanAtom(path) : deps.roiScanIdleAtom;
  });
  const labelsResult = useSelectedAtomValue(() => {
    const path = shellWorkspacePath();
    return path ? deps.annotationLabelsAtom(path) : deps.labelsIdleAtom;
  });
  const saveLabelsResult = useAtomValue(deps.saveAnnotationLabelsAtom);
  const runSaveLabels = useAtomSet(deps.saveAnnotationLabelsAtom, {
    mode: "promise",
  });
  const runSaveAnnotation = useAtomSet(deps.saveRoiFrameAnnotationAtom, {
    mode: "promise",
  });

  const session = useAnnotateSessionCore({
    ui,
    setUi,
    actions: deps.annotatorUiActions,
    workspace,
    scan: {
      scanResult,
      labelsResult,
      shellWorkspacePath,
    },
    toErrorMessage: deps.toErrorMessage,
  });

  const annotation = deps.useAnnotationHistory(null);
  const resetAnnotation = (value: { classificationLabelId: string | null; mask: Uint8Array }) =>
    annotation.reset(value);
  let selectionChanging = false;
  const loadCanvasResources = deps.useCanvasResourceTransaction();

  const visibleStatus = deps.useCanvasTransientStatus(() => session.state().status);

  const requestContext = createMemo(() => {
    const currentUi = session.state();
    const labels = [...(resultData(labelsResult()) ?? [])];
    const position = session.derived().position;
    const selectedRoi = deps.currentRoi(position, currentUi.selection.roi);
    const request = deps.makeRequest(
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
      activeRequestKey: deps.requestKey(position, selectedRoi, currentUi.selection),
    };
  });

  createEffect(() => {
    const activeRequestKey = requestContext().activeRequestKey;
    const shellPath = shellWorkspacePath();
    const workspacePath = untrack(() => session.state().workspacePath);
    const request = untrack(() => requestContext().request);
    if (!workspacePath || workspacePath !== shellPath || !request) {
      deps.annotatorUiActions.setFrame(setUi, null);
      resetAnnotation(deps.emptyValueFor(null));
      deps.annotatorUiActions.setFrameLoading(setUi, false);
      deps.annotatorUiActions.setAnnotationLoading(setUi, false);
      return;
    }
    const contrast = untrack(() => session.state().contrast);
    void activeRequestKey;
    const cleanup = loadCanvasResources<{
      frame: FrameResult;
      annotation: {
        classificationLabelId: string | null;
        mask: Uint8Array;
      };
    }>({
      start: () => {
        if (shouldResetContrastBeforeNavigationLoad()) {
          deps.annotatorUiActions.setContrast(setUi, null);
        }
        deps.annotatorUiActions.setFrameLoading(setUi, true);
        deps.annotatorUiActions.setAnnotationLoading(setUi, true);
        deps.annotatorUiActions.setFrameError(setUi, null);
        deps.annotatorUiActions.setAnnotationError(setUi, null);
        deps.annotatorUiActions.setStatus(setUi, "Loading ROI frame");
      },
      load: (signal) =>
        runClientEffect(
          deps
            .loadRoiFrameWithAnnotationEffect(
              deps.annotatorClient,
              workspacePath,
              request,
              frameLoadRequest({ kind: "navigation", contrast }),
            )
            .pipe(Effect.mapError(toClientError)),
          {
            signal,
          },
        ),
      commit: ({ frame: nextFrame, annotation: nextAnnotation }) => {
        resetAnnotation(nextAnnotation);
        deps.annotatorUiActions.setFrame(setUi, nextFrame);
        deps.annotatorUiActions.setContrastState(setUi, nextFrame);
        deps.annotatorUiActions.setStatus(setUi, `Loaded Pos${request.pos} Roi${request.roi}`);
      },
      reject: (cause) => {
        deps.annotatorUiActions.setFrame(setUi, null);
        resetAnnotation(deps.emptyValueFor(null));
        deps.annotatorUiActions.setFrameError(
          setUi,
          deps.effectErrorMessage(cause, "ROI frame and annotation request failed"),
        );
      },
      settle: () => {
        deps.annotatorUiActions.setFrameLoading(setUi, false);
        deps.annotatorUiActions.setAnnotationLoading(setUi, false);
      },
    });
    onCleanup(cleanup);
  });

  createEffect(() => {
    const contrast = session.state().contrast;
    if (!shouldRunContrastFrameLoad(contrast)) {
      return;
    }
    const currentUi = untrack(() => session.state());
    const workspacePath = currentUi.workspacePath;
    const shellPath = shellWorkspacePath();
    const request = untrack(() => requestContext().request);
    if (!workspacePath || workspacePath !== shellPath || !request) {
      return;
    }
    const cleanup = loadCanvasResources({
      start: () => {
        deps.annotatorUiActions.setFrameLoading(setUi, true);
        deps.annotatorUiActions.setFrameError(setUi, null);
      },
      load: (signal) =>
        runClientEffect(
          deps
            .loadRoiFrameEffect(
              deps.annotatorClient,
              workspacePath,
              request,
              frameLoadRequest({ kind: "contrast", contrast }),
            )
            .pipe(Effect.mapError(toClientError)),
          { signal },
        ),
      commit: (nextFrame) => {
        deps.annotatorUiActions.setFrame(setUi, nextFrame);
        deps.annotatorUiActions.setContrastState(setUi, nextFrame);
      },
      reject: (cause) => {
        deps.annotatorUiActions.setFrameError(
          setUi,
          deps.effectErrorMessage(cause, "ROI frame contrast update failed"),
        );
      },
      settle: () => deps.annotatorUiActions.setFrameLoading(setUi, false),
    });
    onCleanup(cleanup);
  });

  const handleSave = async () => {
    const currentUi = session.state();
    const shellPath = shellWorkspacePath();
    const request = requestContext().request;
    const currentAnnotation = annotation;
    const labels = requestContext().labels;
    const canEdit =
      Boolean(currentUi.frame && request && labels.length > 0) &&
      !currentUi.frameLoading &&
      !currentUi.annotationLoading &&
      !session.meta().scanLoading;
    const canSave = canEdit && currentAnnotation.dirty && !currentUi.saving;
    if (!shellPath || !request || !currentUi.frame || !canSave) return;
    deps.annotatorUiActions.setSaving(setUi, true);
    deps.annotatorUiActions.setSaveError(setUi, null);
    try {
      const segmentationMask = deps.maskHasPixels(currentAnnotation.current.mask);
      await runSaveAnnotation({
        workspacePath: shellPath,
        request,
        annotation: {
          classificationLabelId: currentAnnotation.current.classificationLabelId,
          maskBase64Png: segmentationMask
            ? await deps.encodeMaskToBase64Png(
                currentAnnotation.current.mask,
                currentUi.frame.width,
                currentUi.frame.height,
              )
            : null,
        },
      });
      currentAnnotation.markSaved();
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
    const shellPath = shellWorkspacePath();
    if (!shellPath) {
      session.actions.setLabelError("Select a workspace first.");
      return;
    }
    session.actions.setLabelError(null);
    try {
      const savedLabels = await runSaveLabels({
        workspacePath: shellPath,
        labels: nextLabels,
      });
      deps.annotatorUiActions.applySavedLabels(setUi, savedLabels);
    } catch (cause) {
      session.actions.setLabelError(deps.toErrorMessage(cause, "Annotation labels save failed"));
    }
  };

  const pickWorkspace = (path: string) => {
    workspace.setWorkspacePath(path);
    setFilePickerOpen(false);
  };

  const changeSelection = (fn: () => void) => {
    void (async () => {
      const allowed = await Promise.resolve(
        deps.guardDirtySelection(annotation.dirty, selectionChanging),
      );
      if (!allowed) return;
      selectionChanging = true;
      fn();
      globalThis.setTimeout(() => {
        selectionChanging = false;
      }, 0);
    })();
  };

  return createMemo(() => {
    const currentUi = session.state();
    const derived = session.derived();
    const context = requestContext();
    const currentAnnotation = annotation;
    const labels = context.labels;
    const activeLabelValue = labels.findIndex((label) => label.id === currentUi.activeLabelId) + 1;
    const canEdit =
      Boolean(currentUi.frame && context.request && labels.length > 0) &&
      !currentUi.frameLoading &&
      !currentUi.annotationLoading &&
      !session.meta().scanLoading;
    const toolCanRunWithoutLabelValue = toolCanRunWithoutLabel(currentUi.tool);
    const canEditSegmentation =
      canEdit &&
      currentUi.mode === "segmentation" &&
      (activeLabelValue > 0 || toolCanRunWithoutLabelValue);
    const canSave = canEdit && currentAnnotation.dirty && !currentUi.saving;
    const activeError =
      currentUi.scanError ??
      currentUi.frameError ??
      currentUi.annotationError ??
      currentUi.saveError;
    const transientStatus = visibleStatus();
    const saveLabelsPending = resultLoading(saveLabelsResult());
    const activeToastStatus = currentUi.frameLoading
      ? "Loading ROI frame"
      : currentUi.annotationLoading
        ? "Loading ROI annotation"
        : session.meta().scanLoading
          ? "Scanning ROI workspace"
          : transientStatus;
    const canvasToasts = (() => {
      if (activeError)
        return [
          {
            text: activeError,
            tone: "error" as const,
          },
        ];
      if (activeToastStatus)
        return [
          {
            text: activeToastStatus,
          },
        ];
      return [];
    })();

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
      contrastDomain: currentUi.contrastDomain,
      contrastMin: currentUi.contrastMin,
      contrastMax: currentUi.contrastMax,
      scanLoading: session.meta().scanLoading,
      frameLoading: currentUi.frameLoading,
      annotationLoading: currentUi.annotationLoading,
      saving: currentUi.saving,
      scanError: currentUi.scanError,
      frameError: currentUi.frameError,
      annotationError: currentUi.annotationError,
      saveError: currentUi.saveError,
      labelError: currentUi.labelError,
      labelDialogOpen: currentUi.labelDialogOpen,
      filePickerOpen: filePickerOpen(),
      position: derived.position,
      request: context.request,
      annotation: currentAnnotation,
      canEdit,
      canEditSegmentation,
      canSave,
      canvasToasts,
      setFilePickerOpen,
      setLabelDialogOpen: session.actions.setLabelDialogOpen,
      setLabelError: session.actions.setLabelError,
      setSelection: session.actions.setSelection,
      setContrast: session.actions.setContrast,
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
  });
}

export type { RoiSelection, StateUpdater };

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
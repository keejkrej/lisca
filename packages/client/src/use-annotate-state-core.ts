import type { AnnotationLabel, FrameResult, RoiFrameRequest, RoiIndexEntry, RoiPositionScan } from "@lisca/contracts";
import { resultData, resultLoading } from "./atoms/result-utils.ts";
import { useAnnotateSessionCore, type AnnotateWorkspaceSync } from "./use-annotate-session.ts";
import { runClientEffect } from "./runtime.ts";
import type { CanvasResourceTransactionOptions } from "./canvas-resource-transaction.ts";
import type { AnnotatorUiActions, AnnotatorUiAtom, AnnotatorUiState, RoiSelection, StateUpdater } from "./atoms/annotator-ui.ts";
import { toClientError } from "./client-error.ts";
import type { AnnotatorDataPort } from "./ports/types.ts";
import type { Atom, Result } from "@effect-atom/atom-react";
import { useAtom, useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { Effect } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AnnotationHistoryHandle = {
  current: {
    classificationLabelId: string | null;
    mask: Uint8Array;
  };
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  reset: (value: {
    classificationLabelId: string | null;
    mask: Uint8Array;
  }) => void;
  commit: (value: {
    classificationLabelId: string | null;
    mask: Uint8Array;
  }) => void;
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
    { frame: FrameResult; annotation: { classificationLabelId: string | null; mask: Uint8Array } },
    import("./client-error.ts").ClientError
  >;
  annotatorUiAtom: AnnotatorUiAtom;
  annotatorUiActions: AnnotatorUiActions;
  roiWorkspaceScanAtom: (workspacePath: string) => Atom.Atom<Result.Result<import("@lisca/contracts").RoiWorkspaceScan, unknown>>;
  roiScanIdleAtom: Atom.Atom<Result.Result<import("@lisca/contracts").RoiWorkspaceScan, unknown>>;
  annotationLabelsAtom: (workspacePath: string) => Atom.Atom<Result.Result<readonly AnnotationLabel[], unknown>>;
  labelsIdleAtom: Atom.Atom<Result.Result<readonly AnnotationLabel[], unknown>>;
  saveAnnotationLabelsAtom: Atom.AtomResultFn<
    { workspacePath: string; labels: AnnotationLabel[] },
    readonly AnnotationLabel[],
    unknown
  >;
  saveRoiFrameAnnotationAtom: Atom.AtomResultFn<
    {
      workspacePath: string;
      request: RoiFrameRequest;
      annotation: { classificationLabelId: string | null; maskBase64Png: string | null };
    },
    unknown,
    unknown
  >;
  useShellWorkspace: () => AnnotateWorkspaceSync;
  useCanvasResourceTransaction: () => <T>(
    options: CanvasResourceTransactionOptions<T>,
  ) => () => void;
  useCanvasTransientStatus: (status: string | null) => string | null;
  guardDirtySelection: (dirty: boolean, selectionChanging: boolean) => boolean;
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
  const shellWorkspacePath = workspace.workspacePath;
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [ui, setUi] = useAtom(deps.annotatorUiAtom);

  const scanResult = useAtomValue(
    shellWorkspacePath ? deps.roiWorkspaceScanAtom(shellWorkspacePath) : deps.roiScanIdleAtom,
  );
  const labelsResult = useAtomValue(
    shellWorkspacePath ? deps.annotationLabelsAtom(shellWorkspacePath) : deps.labelsIdleAtom,
  );
  const saveLabelsResult = useAtomValue(deps.saveAnnotationLabelsAtom);
  const runSaveLabels = useAtomSet(deps.saveAnnotationLabelsAtom, { mode: "promise" });
  const runSaveAnnotation = useAtomSet(deps.saveRoiFrameAnnotationAtom, { mode: "promise" });

  const session = useAnnotateSessionCore({
    ui,
    setUi,
    actions: deps.annotatorUiActions,
    workspace,
    scan: { scanResult, labelsResult, shellWorkspacePath },
    toErrorMessage: deps.toErrorMessage,
  });

  const {
    workspacePath,
    selection,
    activeLabelId,
    mode,
    tool,
    brushSize,
    overlayOpacity,
    frame,
    contrast,
    contrastDomain,
    contrastMin,
    contrastMax,
    frameLoading,
    annotationLoading,
    saving,
    scanError,
    frameError,
    annotationError,
    saveError,
    labelError,
    status,
    labelDialogOpen,
  } = session.state;

  const {
    setSelection,
    setContrast,
    setMode,
    setTool,
    setBrushSize,
    setOverlayOpacity,
    setActiveLabelId,
    setLabelDialogOpen,
    setLabelError,
  } = session.actions;

  const { scanLoading } = session.meta;
  const { scan, position } = session.derived;

  const annotation = deps.useAnnotationHistory(frame);
  const resetAnnotation = annotation.reset;
  const selectionChangingRef = useRef(false);
  const loadCanvasResources = deps.useCanvasResourceTransaction();

  const labels = useMemo((): AnnotationLabel[] => [...(resultData(labelsResult) ?? [])], [labelsResult]);
  const selectedRoi = useMemo(() => deps.currentRoi(position, selection.roi), [deps, position, selection.roi]);
  const request = useMemo(
    () =>
      deps.makeRequest(position, selectedRoi, selection.channel, selection.timeIndex, selection.zIndex),
    [deps, position, selectedRoi, selection.channel, selection.timeIndex, selection.zIndex],
  );
  const activeSelectionKey = deps.roiRequestSelectionKey(selection);
  const activeRequestKey = deps.requestKey(position, selectedRoi, selection);
  const activeLabelValue = labels.findIndex((label) => label.id === activeLabelId) + 1;
  const canEdit =
    Boolean(frame && request && labels.length > 0) &&
    !frameLoading &&
    !annotationLoading &&
    !scanLoading;
  const toolCanRunWithoutLabel = tool === "brush-erase" || tool === "lasso-erase";
  const canEditSegmentation =
    canEdit && mode === "segmentation" && (activeLabelValue > 0 || toolCanRunWithoutLabel);
  const canSave = canEdit && annotation.dirty && !saving;
  const activeError = scanError ?? frameError ?? annotationError ?? saveError;
  const visibleStatus = deps.useCanvasTransientStatus(status);
  const saveLabelsPending = resultLoading(saveLabelsResult);

  const activeToastStatus = frameLoading
    ? "Loading ROI frame"
    : annotationLoading
      ? "Loading ROI annotation"
      : scanLoading
        ? "Scanning ROI workspace"
        : visibleStatus;
  const canvasToasts = useMemo(() => {
    if (activeError) return [{ text: activeError, tone: "error" as const }];
    if (activeToastStatus) return [{ text: activeToastStatus }];
    return [];
  }, [activeError, activeToastStatus]);

  const guardDirty = useCallback(() => {
    return deps.guardDirtySelection(annotation.dirty, selectionChangingRef.current);
  }, [annotation.dirty, deps]);

  const changeSelection = useCallback(
    (fn: () => void) => {
      if (!guardDirty()) return;
      selectionChangingRef.current = true;
      fn();
      globalThis.setTimeout(() => {
        selectionChangingRef.current = false;
      }, 0);
    },
    [guardDirty],
  );

  useEffect(() => {
    setContrast(null);
  }, [activeSelectionKey, setContrast]);

  useEffect(() => {
    if (!workspacePath || workspacePath !== shellWorkspacePath || !request) {
      deps.annotatorUiActions.setFrame(setUi, null);
      resetAnnotation(deps.emptyValueFor(null));
      deps.annotatorUiActions.setFrameLoading(setUi, false);
      deps.annotatorUiActions.setAnnotationLoading(setUi, false);
      return;
    }

    return loadCanvasResources<{
      frame: FrameResult;
      annotation: { classificationLabelId: string | null; mask: Uint8Array };
    }>({
      start: () => {
        deps.annotatorUiActions.setFrameLoading(setUi, true);
        deps.annotatorUiActions.setAnnotationLoading(setUi, true);
        deps.annotatorUiActions.setFrameError(setUi, null);
        deps.annotatorUiActions.setAnnotationError(setUi, null);
        deps.annotatorUiActions.setStatus(setUi, "Loading ROI frame");
      },
      load: (signal) =>
        runClientEffect(
          deps
            .loadRoiFrameWithAnnotationEffect(deps.annotatorClient, workspacePath, request, contrast)
            .pipe(Effect.mapError(toClientError)),
          { signal },
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
  }, [
    activeRequestKey,
    contrast,
    deps.annotatorClient,
    deps.annotatorUiActions,
    deps.emptyValueFor,
    deps.effectErrorMessage,
    deps.loadRoiFrameWithAnnotationEffect,
    loadCanvasResources,
    request,
    resetAnnotation,
    setUi,
    workspacePath,
    shellWorkspacePath,
  ]);

  const handleSave = useCallback(async () => {
    if (!shellWorkspacePath || !request || !frame || !canSave) return;
    deps.annotatorUiActions.setSaving(setUi, true);
    deps.annotatorUiActions.setSaveError(setUi, null);
    try {
      const segmentationMask = deps.maskHasPixels(annotation.current.mask);
      await runSaveAnnotation({
        workspacePath: shellWorkspacePath,
        request,
        annotation: {
          classificationLabelId: annotation.current.classificationLabelId,
          maskBase64Png: segmentationMask
            ? await deps.encodeMaskToBase64Png(annotation.current.mask, frame.width, frame.height)
            : null,
        },
      });
      annotation.markSaved();
      deps.annotatorUiActions.setStatus(setUi, "Saved ROI annotation");
    } catch (cause) {
      deps.annotatorUiActions.setSaveError(setUi, deps.toErrorMessage(cause, "ROI annotation save failed"));
    } finally {
      deps.annotatorUiActions.setSaving(setUi, false);
    }
  }, [
    annotation,
    canSave,
    deps,
    frame,
    request,
    runSaveAnnotation,
    setUi,
    shellWorkspacePath,
  ]);

  const handleSaveLabels = useCallback(
    async (nextLabels: AnnotationLabel[]) => {
      if (!shellWorkspacePath) {
        setLabelError("Select a workspace first.");
        return;
      }
      setLabelError(null);
      try {
        const savedLabels = await runSaveLabels({
          workspacePath: shellWorkspacePath,
          labels: nextLabels,
        });
        deps.annotatorUiActions.applySavedLabels(setUi, savedLabels);
      } catch (cause) {
        setLabelError(deps.toErrorMessage(cause, "Annotation labels save failed"));
      }
    },
    [deps, runSaveLabels, setLabelError, setUi, shellWorkspacePath],
  );

  const pickWorkspace = useCallback(
    (path: string) => {
      workspace.setWorkspacePath(path);
      setFilePickerOpen(false);
    },
    [workspace],
  );

  return useMemo(
    () => ({
      workspacePath,
      scan,
      labels,
      selection,
      activeLabelId,
      mode,
      tool,
      brushSize,
      overlayOpacity,
      frame,
      contrastDomain,
      contrastMin,
      contrastMax,
      scanLoading,
      frameLoading,
      annotationLoading,
      saving,
      scanError,
      frameError,
      annotationError,
      saveError,
      labelError,
      labelDialogOpen,
      filePickerOpen,
      position,
      request,
      annotation,
      canEdit,
      canEditSegmentation,
      canSave,
      canvasToasts,
      setFilePickerOpen,
      setLabelDialogOpen,
      setLabelError,
      setSelection,
      setContrast,
      setMode,
      setTool,
      setBrushSize,
      setOverlayOpacity,
      setActiveLabelId,
      changeSelection,
      handleSave,
      handleSaveLabels,
      saveLabelsPending,
      pickWorkspace,
    }),
    [
      activeLabelId,
      annotation,
      annotationError,
      annotationLoading,
      brushSize,
      canEdit,
      canEditSegmentation,
      canSave,
      canvasToasts,
      changeSelection,
      contrastDomain,
      contrastMax,
      contrastMin,
      filePickerOpen,
      frame,
      frameError,
      frameLoading,
      handleSave,
      handleSaveLabels,
      labelDialogOpen,
      labelError,
      labels,
      mode,
      overlayOpacity,
      pickWorkspace,
      position,
      request,
      saveError,
      saveLabelsPending,
      saving,
      scan,
      scanError,
      scanLoading,
      selection,
      setActiveLabelId,
      setBrushSize,
      setContrast,
      setLabelDialogOpen,
      setLabelError,
      setMode,
      setOverlayOpacity,
      setSelection,
      setTool,
      tool,
      workspacePath,
    ],
  );
}

export type { RoiSelection, StateUpdater };

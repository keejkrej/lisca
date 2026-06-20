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
import type { Atom, Result } from "@effect-atom/atom-react";
import { useAtom, useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { Effect } from "effect";
import { useEffect, useRef, useState } from "react";
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
  useCanvasTransientStatus: (status: string | null) => string | null;
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
  const labels = [...(resultData(labelsResult) ?? [])];
  const selectedRoi = deps.currentRoi(position, selection.roi);
  const request = deps.makeRequest(
    position,
    selectedRoi,
    selection.channel,
    selection.timeIndex,
    selection.zIndex,
  );
  const activeRequestKey = deps.requestKey(position, selectedRoi, selection);
  const activeLabelValue = labels.findIndex((label) => label.id === activeLabelId) + 1;
  const canEdit =
    Boolean(frame && request && labels.length > 0) &&
    !frameLoading &&
    !annotationLoading &&
    !scanLoading;
  const toolCanRunWithoutLabelValue = toolCanRunWithoutLabel(tool);
  const canEditSegmentation =
    canEdit && mode === "segmentation" && (activeLabelValue > 0 || toolCanRunWithoutLabelValue);
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
  const changeSelection = (fn: () => void) => {
    void (async () => {
      const allowed = await Promise.resolve(
        deps.guardDirtySelection(annotation.dirty, selectionChangingRef.current),
      );
      if (!allowed) return;
      selectionChangingRef.current = true;
      fn();
      globalThis.setTimeout(() => {
        selectionChangingRef.current = false;
      }, 0);
    })();
  };
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
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeRequestKey,
    deps.annotatorClient,
    deps.annotatorUiActions,
    deps.emptyValueFor,
    deps.effectErrorMessage,
    deps.loadRoiFrameWithAnnotationEffect,
    loadCanvasResources,
    request,
    resetAnnotation,
    setContrast,
    setUi,
    workspacePath,
    shellWorkspacePath,
  ]);
  useEffect(() => {
    if (
      !shouldRunContrastFrameLoad(contrast) ||
      !workspacePath ||
      workspacePath !== shellWorkspacePath ||
      !request
    ) {
      return;
    }
    return loadCanvasResources({
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
    // Intentionally contrast-only: ROI navigation is handled by the effect above.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [contrast]);
  const handleSave = async () => {
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
      deps.annotatorUiActions.setSaveError(
        setUi,
        deps.toErrorMessage(cause, "ROI annotation save failed"),
      );
    } finally {
      deps.annotatorUiActions.setSaving(setUi, false);
    }
  };
  const handleSaveLabels = async (nextLabels: AnnotationLabel[]) => {
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
  };
  const pickWorkspace = (path: string) => {
    workspace.setWorkspacePath(path);
    setFilePickerOpen(false);
  };
  return {
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
    contrast,
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
  };
}
export type { RoiSelection, StateUpdater };

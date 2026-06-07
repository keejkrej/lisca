import type { AnnotationLabel } from "@lisca/contracts";
import { resultData, resultFailureMessage, resultLoading } from "@lisca/client/atoms";
import { useAnnotateSessionCore } from "@lisca/client/annotate-session/react";
import { runClientEffect } from "@lisca/client/runtime";
import {
  useCanvasResourceTransaction,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { useShellWorkspace } from "@lisca/ui/shell";
import { useAtom, useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { annotatorClient, toErrorMessage } from "../api/annotator-port";
import {
  annotationLabelsAtom,
  labelsIdleAtom,
  roiScanIdleAtom,
  roiWorkspaceScanAtom,
  saveAnnotationLabelsAtom,
  saveRoiFrameAnnotationAtom,
} from "../atoms/annotator-query-atoms";
import {
  annotatorUiActions,
  annotatorUiAtom,
  currentRoi,
  requestKey,
  roiRequestSelectionKey,
} from "../atoms/annotator-ui-atoms";
import { effectErrorMessage, loadRoiFrameWithAnnotationEffect } from "../effects/roi-loader";
import { emptyValueFor, useAnnotationHistory } from "./use-annotation-history";
import { makeRequest } from "../utils/roi-request";
import { encodeMaskToBase64Png, maskHasPixels } from "../utils/annotation-utils";

export function useAnnotateState() {
  const workspace = useShellWorkspace();
  const shellWorkspacePath = workspace.workspacePath;
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [ui, setUi] = useAtom(annotatorUiAtom);

  const scanResult = useAtomValue(
    shellWorkspacePath ? roiWorkspaceScanAtom(shellWorkspacePath) : roiScanIdleAtom,
  );
  const labelsResult = useAtomValue(
    shellWorkspacePath ? annotationLabelsAtom(shellWorkspacePath) : labelsIdleAtom,
  );
  const saveLabelsResult = useAtomValue(saveAnnotationLabelsAtom);
  const runSaveLabels = useAtomSet(saveAnnotationLabelsAtom, { mode: "promise" });
  const runSaveAnnotation = useAtomSet(saveRoiFrameAnnotationAtom, { mode: "promise" });

  const session = useAnnotateSessionCore({
    ui,
    setUi,
    actions: annotatorUiActions,
    workspace,
    scan: { scanResult, labelsResult, shellWorkspacePath },
    toErrorMessage,
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

  const annotation = useAnnotationHistory(frame);
  const resetAnnotation = annotation.reset;
  const selectionChangingRef = useRef(false);
  const loadCanvasResources = useCanvasResourceTransaction();

  const labels = resultData(labelsResult) ?? [];
  const selectedRoi = useMemo(() => currentRoi(position, selection.roi), [position, selection.roi]);
  const request = useMemo(
    () =>
      makeRequest(position, selectedRoi, selection.channel, selection.timeIndex, selection.zIndex),
    [position, selectedRoi, selection.channel, selection.timeIndex, selection.zIndex],
  );
  const activeSelectionKey = roiRequestSelectionKey(selection);
  const activeRequestKey = requestKey(position, selectedRoi, selection);
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
  const visibleStatus = useCanvasTransientStatus(status);
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
    if (!annotation.dirty || selectionChangingRef.current) return true;
    return window.confirm("Discard unsaved annotation changes?");
  }, [annotation.dirty]);

  const changeSelection = useCallback(
    (fn: () => void) => {
      if (!guardDirty()) return;
      selectionChangingRef.current = true;
      fn();
      window.setTimeout(() => {
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
      annotatorUiActions.setFrame(setUi, null);
      resetAnnotation(emptyValueFor(null));
      annotatorUiActions.setFrameLoading(setUi, false);
      annotatorUiActions.setAnnotationLoading(setUi, false);
      return;
    }

    return loadCanvasResources({
      start: () => {
        annotatorUiActions.setFrameLoading(setUi, true);
        annotatorUiActions.setAnnotationLoading(setUi, true);
        annotatorUiActions.setFrameError(setUi, null);
        annotatorUiActions.setAnnotationError(setUi, null);
        annotatorUiActions.setStatus(setUi, "Loading ROI frame");
      },
      load: (signal) =>
        runClientEffect(
          loadRoiFrameWithAnnotationEffect(annotatorClient, workspacePath, request, contrast),
          { signal },
        ),
      commit: ({ frame: nextFrame, annotation: nextAnnotation }) => {
        resetAnnotation(nextAnnotation);
        annotatorUiActions.setFrame(setUi, nextFrame);
        annotatorUiActions.setContrastState(setUi, nextFrame);
        annotatorUiActions.setStatus(setUi, `Loaded Pos${request.pos} Roi${request.roi}`);
      },
      reject: (cause) => {
        annotatorUiActions.setFrame(setUi, null);
        resetAnnotation(emptyValueFor(null));
        annotatorUiActions.setFrameError(
          setUi,
          effectErrorMessage(cause, "ROI frame and annotation request failed"),
        );
      },
      settle: () => {
        annotatorUiActions.setFrameLoading(setUi, false);
        annotatorUiActions.setAnnotationLoading(setUi, false);
      },
    });
  }, [
    activeRequestKey,
    contrast,
    loadCanvasResources,
    request,
    resetAnnotation,
    setUi,
    workspacePath,
    shellWorkspacePath,
  ]);

  const handleSave = useCallback(async () => {
    if (!shellWorkspacePath || !request || !frame || !canSave) return;
    annotatorUiActions.setSaving(setUi, true);
    annotatorUiActions.setSaveError(setUi, null);
    try {
      const segmentationMask = maskHasPixels(annotation.current.mask);
      await runSaveAnnotation({
        workspacePath: shellWorkspacePath,
        request,
        annotation: {
          classificationLabelId: annotation.current.classificationLabelId,
          maskBase64Png: segmentationMask
            ? await encodeMaskToBase64Png(annotation.current.mask, frame.width, frame.height)
            : null,
        },
      });
      annotation.markSaved();
      annotatorUiActions.setStatus(setUi, "Saved ROI annotation");
    } catch (cause) {
      annotatorUiActions.setSaveError(setUi, toErrorMessage(cause, "ROI annotation save failed"));
    } finally {
      annotatorUiActions.setSaving(setUi, false);
    }
  }, [
    annotation,
    canSave,
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
        annotatorUiActions.applySavedLabels(setUi, savedLabels);
      } catch (cause) {
        setLabelError(toErrorMessage(cause, "Annotation labels save failed"));
      }
    },
    [runSaveLabels, setLabelError, setUi, shellWorkspacePath],
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

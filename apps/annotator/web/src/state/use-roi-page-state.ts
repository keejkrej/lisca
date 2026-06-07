import type { AnnotationLabel } from "@lisca/contracts";
import { resultData, resultFailureMessage, resultLoading } from "@lisca/client/atoms";
import { runClientEffect } from "@lisca/client/runtime";
import {
  useCanvasResourceTransaction,
  useCanvasTransientStatus,
  useShellWorkspace,
} from "@lisca/ui";
import { clamp } from "@lisca/utils";
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
  currentPosition,
  currentRoi,
  requestKey,
  roiRequestSelectionKey,
} from "../atoms/annotator-ui-atoms";
import { effectErrorMessage, loadRoiFrameWithAnnotationEffect } from "../effects/roi-loader";
import { emptyValueFor, useAnnotationHistory } from "./use-annotation-history";
import { makeRequest } from "../utils/roi-request";
import { encodeMaskToBase64Png, maskHasPixels } from "../utils/annotation-utils";

export function useRoiPageState() {
  const workspace = useShellWorkspace();
  const shellWorkspacePath = workspace.workspacePath;
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [ui, setUi] = useAtom(annotatorUiAtom);
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
  } = ui;

  const setSelection = useCallback(
    (patch: Partial<typeof selection>) => annotatorUiActions.setSelection(setUi, patch),
    [setUi],
  );
  const setContrast = useCallback(
    (next: typeof contrast) => annotatorUiActions.setContrast(setUi, next),
    [setUi],
  );
  const setMode = useCallback(
    (next: typeof mode) => annotatorUiActions.setMode(setUi, next),
    [setUi],
  );
  const setTool = useCallback(
    (next: typeof tool) => annotatorUiActions.setTool(setUi, next),
    [setUi],
  );
  const setBrushSize = useCallback(
    (next: number) => annotatorUiActions.setBrushSize(setUi, next),
    [setUi],
  );
  const setOverlayOpacity = useCallback(
    (next: number) => annotatorUiActions.setOverlayOpacity(setUi, next),
    [setUi],
  );
  const setActiveLabelId = useCallback(
    (next: string | null) => annotatorUiActions.setActiveLabelId(setUi, next),
    [setUi],
  );
  const setLabelDialogOpen = useCallback(
    (open: boolean) => annotatorUiActions.setLabelDialogOpen(setUi, open),
    [setUi],
  );
  const setLabelError = useCallback(
    (error: string | null) => annotatorUiActions.setLabelError(setUi, error),
    [setUi],
  );

  const annotation = useAnnotationHistory(frame);
  const resetAnnotation = annotation.reset;
  const selectionChangingRef = useRef(false);
  const loadCanvasResources = useCanvasResourceTransaction();

  const scanResult = useAtomValue(
    shellWorkspacePath ? roiWorkspaceScanAtom(shellWorkspacePath) : roiScanIdleAtom,
  );
  const labelsResult = useAtomValue(
    shellWorkspacePath ? annotationLabelsAtom(shellWorkspacePath) : labelsIdleAtom,
  );
  const saveLabelsResult = useAtomValue(saveAnnotationLabelsAtom);
  const runSaveLabels = useAtomSet(saveAnnotationLabelsAtom, { mode: "promise" });
  const runSaveAnnotation = useAtomSet(saveRoiFrameAnnotationAtom, { mode: "promise" });

  const scan = resultData(scanResult) ?? null;
  const labels = resultData(labelsResult) ?? [];
  const scanLoading = Boolean(
    shellWorkspacePath && (resultLoading(scanResult) || resultLoading(labelsResult)),
  );

  const position = useMemo(() => currentPosition(scan, selection.pos), [scan, selection.pos]);
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
    if (workspace.workspacePath === workspacePath) return;
    if (workspace.workspacePath == null && workspacePath != null) {
      workspace.setWorkspacePath(workspacePath);
      return;
    }
    annotatorUiActions.setWorkspacePath(setUi, workspace.workspacePath);
  }, [setUi, workspace, workspacePath]);

  useEffect(() => {
    if (scanLoading) {
      annotatorUiActions.setScanError(setUi, null);
      annotatorUiActions.setStatus(setUi, "Scanning ROI workspace");
    }
  }, [scanLoading, setUi]);

  useEffect(() => {
    if (workspacePath !== shellWorkspacePath) return;
    if (scan) annotatorUiActions.setStatus(setUi, "ROI workspace loaded");
  }, [scan, setUi, shellWorkspacePath, workspacePath]);

  useEffect(() => {
    if (workspacePath !== shellWorkspacePath) return;
    if (labels.length === 0) return;
    annotatorUiActions.syncActiveLabelFromLabels(
      setUi,
      labels.map((label) => label.id),
    );
  }, [labels, setUi, shellWorkspacePath, workspacePath]);

  useEffect(() => {
    if (workspacePath !== shellWorkspacePath) return;
    const scanLoadError = resultFailureMessage(scanResult);
    const labelsLoadError = resultFailureMessage(labelsResult);
    const error = scanLoadError ?? labelsLoadError;
    if (!error) return;
    annotatorUiActions.setFrame(setUi, null);
    annotatorUiActions.setScanError(setUi, toErrorMessage(error, "ROI workspace load failed"));
  }, [labelsResult, scanResult, setUi, shellWorkspacePath, workspacePath]);

  useEffect(() => {
    const firstPosition = scan?.positions[0] ?? null;
    if (!firstPosition) {
      setSelection({ pos: null, roi: null, channel: null, timeIndex: 0, zIndex: 0 });
      return;
    }
    if (!scan?.positions.some((entry) => entry.pos === selection.pos)) {
      setSelection({ pos: firstPosition.pos });
    }
  }, [scan, selection.pos, setSelection]);

  useEffect(() => {
    if (!position) return;
    const patch = {
      channel: position.channels.includes(selection.channel ?? Number.NaN)
        ? selection.channel
        : (position.channels[0] ?? null),
      roi: position.rois.some((entry) => entry.roi === selection.roi)
        ? selection.roi
        : (position.rois[0]?.roi ?? null),
      timeIndex: clamp(selection.timeIndex, 0, Math.max(0, position.times.length - 1)),
      zIndex: clamp(selection.zIndex, 0, Math.max(0, position.zSlices.length - 1)),
    };
    if (
      patch.channel !== selection.channel ||
      patch.roi !== selection.roi ||
      patch.timeIndex !== selection.timeIndex ||
      patch.zIndex !== selection.zIndex
    ) {
      setSelection(patch);
    }
  }, [position, selection, setSelection]);

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

  const handleSave = async () => {
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
      annotatorUiActions.applySavedLabels(setUi, savedLabels);
    } catch (cause) {
      setLabelError(toErrorMessage(cause, "Annotation labels save failed"));
    }
  };

  const pickWorkspace = useCallback(
    (path: string) => {
      workspace.setWorkspacePath(path);
      setFilePickerOpen(false);
    },
    [workspace],
  );

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

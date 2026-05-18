import type { AnnotationLabel } from "@lisca/contracts";
import { useCanvasTransientStatus, useShellWorkspace } from "@lisca/ui";
import { Effect, Exit } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  annotatorApi,
  toAnnotatorErrorMessage,
  useAnnotationLabelsQuery,
  useRoiWorkspaceScanQuery,
  useSaveAnnotationLabelsMutation,
  useSaveRoiFrameAnnotationMutation,
} from "../api/annotator-queries";
import {
  effectErrorMessage,
  loadRoiFrameAnnotationEffect,
  loadRoiFrameEffect,
} from "../effects/roi-loader";
import {
  currentPosition,
  currentRoi,
  requestKey,
  roiRequestSelectionKey,
  useAnnotatorStore,
} from "./annotator-store";
import { emptyValueFor, useAnnotationHistory } from "./use-annotation-history";
import { makeRequest } from "../utils/roi-request";
import { encodeMaskToBase64Png, maskHasPixels } from "../utils/annotation-utils";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useRoiPageState() {
  const workspace = useShellWorkspace();
  const shellWorkspacePath = workspace.workspacePath;
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const {
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
    status,
    labelDialogOpen,
    setWorkspacePath,
    setScan,
    setLabels,
    setSelection,
    setActiveLabelId,
    setMode,
    setTool,
    setBrushSize,
    setOverlayOpacity,
    setFrame,
    setContrast,
    setContrastState,
    setScanLoading,
    setFrameLoading,
    setAnnotationLoading,
    setSaving,
    setScanError,
    setFrameError,
    setAnnotationError,
    setSaveError,
    setLabelError,
    setStatus,
    setLabelDialogOpen,
  } = useAnnotatorStore();
  const annotation = useAnnotationHistory(frame);
  const resetAnnotation = annotation.reset;
  const selectionChangingRef = useRef(false);
  const frameLoadIdRef = useRef(0);
  const annotationLoadIdRef = useRef(0);
  const scanQuery = useRoiWorkspaceScanQuery(shellWorkspacePath);
  const labelsQuery = useAnnotationLabelsQuery(shellWorkspacePath);
  const saveLabelsMutation = useSaveAnnotationLabelsMutation(shellWorkspacePath);
  const saveAnnotationMutation = useSaveRoiFrameAnnotationMutation(shellWorkspacePath);

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
    setWorkspacePath(workspace.workspacePath);
  }, [setWorkspacePath, workspace, workspacePath]);

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

  useEffect(() => {
    setScanLoading(Boolean(shellWorkspacePath && (scanQuery.isFetching || labelsQuery.isFetching)));
    if (scanQuery.isFetching || labelsQuery.isFetching) {
      setScanError(null);
      setStatus("Scanning ROI workspace");
    }
  }, [
    labelsQuery.isFetching,
    scanQuery.isFetching,
    setScanError,
    setScanLoading,
    setStatus,
    shellWorkspacePath,
  ]);

  useEffect(() => {
    if (workspacePath !== shellWorkspacePath) return;
    if (scanQuery.data) {
      setScan(scanQuery.data);
      setStatus("ROI workspace loaded");
    }
  }, [scanQuery.data, setScan, setStatus, shellWorkspacePath, workspacePath]);

  useEffect(() => {
    if (workspacePath !== shellWorkspacePath) return;
    if (labelsQuery.data) setLabels(labelsQuery.data);
  }, [labelsQuery.data, setLabels, shellWorkspacePath, workspacePath]);

  useEffect(() => {
    if (workspacePath !== shellWorkspacePath) return;
    const error = scanQuery.error ?? labelsQuery.error;
    if (!error) return;
    setFrame(null);
    setScanError(toAnnotatorErrorMessage(error, "ROI workspace load failed"));
  }, [
    labelsQuery.error,
    scanQuery.error,
    setFrame,
    setScanError,
    shellWorkspacePath,
    workspacePath,
  ]);

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
    frameLoadIdRef.current += 1;
    const loadId = frameLoadIdRef.current;

    if (!workspacePath || workspacePath !== shellWorkspacePath || !request) {
      setFrame(null);
      setFrameLoading(false);
      return;
    }

    const abortController = new AbortController();
    const commit = (apply: () => void) => {
      if (frameLoadIdRef.current === loadId && !abortController.signal.aborted) apply();
    };

    setFrameLoading(true);
    setFrameError(null);
    setStatus("Loading ROI frame");

    const program = loadRoiFrameEffect(annotatorApi, workspacePath, request, contrast).pipe(
      Effect.tap((nextFrame) =>
        Effect.sync(() =>
          commit(() => {
            setFrame(nextFrame);
            setContrastState(nextFrame);
            setStatus(`Loaded Pos${request.pos} Roi${request.roi}`);
          }),
        ),
      ),
      Effect.catchAll((cause) =>
        Effect.sync(() =>
          commit(() => {
            setFrame(null);
            setFrameError(effectErrorMessage(cause, "ROI frame request failed"));
          }),
        ),
      ),
      Effect.ensuring(Effect.sync(() => commit(() => setFrameLoading(false)))),
    );

    void Effect.runPromiseExit(program, { signal: abortController.signal }).then((exit) => {
      if (!Exit.isFailure(exit) || abortController.signal.aborted) return;
      commit(() => {
        setFrame(null);
        setFrameError(effectErrorMessage(exit.cause, "ROI frame request failed"));
        setFrameLoading(false);
      });
    });

    return () => {
      abortController.abort();
    };
  }, [
    activeRequestKey,
    contrast,
    request,
    setContrastState,
    setFrame,
    setFrameError,
    setFrameLoading,
    setStatus,
    workspacePath,
    shellWorkspacePath,
  ]);

  useEffect(() => {
    annotationLoadIdRef.current += 1;
    const loadId = annotationLoadIdRef.current;

    if (!workspacePath || workspacePath !== shellWorkspacePath || !request || !frame) {
      resetAnnotation(emptyValueFor(frame));
      setAnnotationLoading(false);
      return;
    }

    const abortController = new AbortController();
    const commit = (apply: () => void) => {
      if (annotationLoadIdRef.current === loadId && !abortController.signal.aborted) apply();
    };

    setAnnotationLoading(true);
    setAnnotationError(null);
    setStatus("Loading ROI annotation");

    const program = loadRoiFrameAnnotationEffect(annotatorApi, workspacePath, request, frame).pipe(
      Effect.tap((value) =>
        Effect.sync(() =>
          commit(() => {
            resetAnnotation(value);
            setStatus(null);
          }),
        ),
      ),
      Effect.catchAll((cause) =>
        Effect.sync(() =>
          commit(() => {
            resetAnnotation(emptyValueFor(frame));
            setAnnotationError(effectErrorMessage(cause, "ROI annotation load failed"));
          }),
        ),
      ),
      Effect.ensuring(Effect.sync(() => commit(() => setAnnotationLoading(false)))),
    );

    void Effect.runPromiseExit(program, { signal: abortController.signal }).then((exit) => {
      if (!Exit.isFailure(exit) || abortController.signal.aborted) return;
      commit(() => {
        resetAnnotation(emptyValueFor(frame));
        setAnnotationError(effectErrorMessage(exit.cause, "ROI annotation load failed"));
        setAnnotationLoading(false);
      });
    });

    return () => {
      abortController.abort();
    };
  }, [
    activeRequestKey,
    frame,
    request,
    resetAnnotation,
    setAnnotationError,
    setAnnotationLoading,
    setStatus,
    workspacePath,
    shellWorkspacePath,
  ]);

  const handleSave = async () => {
    if (!shellWorkspacePath || !request || !frame || !canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const segmentationMask = maskHasPixels(annotation.current.mask);
      await saveAnnotationMutation.mutateAsync({
        request,
        annotation: {
          classificationLabelId: annotation.current.classificationLabelId,
          maskBase64Png: segmentationMask
            ? await encodeMaskToBase64Png(annotation.current.mask, frame.width, frame.height)
            : null,
        },
      });
      annotation.markSaved();
      setStatus("Saved ROI annotation");
    } catch (cause) {
      setSaveError(toAnnotatorErrorMessage(cause, "ROI annotation save failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLabels = async (nextLabels: AnnotationLabel[]) => {
    if (!shellWorkspacePath) {
      setLabelError("Select a workspace first.");
      return;
    }
    setLabelError(null);
    try {
      const savedLabels = await saveLabelsMutation.mutateAsync(nextLabels);
      setLabels(savedLabels);
      setActiveLabelId(savedLabels[0]?.id ?? null);
      setLabelDialogOpen(false);
    } catch (cause) {
      setLabelError(toAnnotatorErrorMessage(cause, "Annotation labels save failed"));
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
    saveLabelsPending: saveLabelsMutation.isPending,
    pickWorkspace,
  };
}

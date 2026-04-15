import type { AnnotationLabel, FrameResult } from "lisca/viewer/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAnnotationModeStore } from "../app/annotationModeStore";
import {
  annotationValuesEqual,
  cloneAnnotationValue,
  coerceMask,
  createEmptyMask,
  maskHasPixels,
  type RoiAnnotationValue,
} from "./annotationUtils";
import type { RoiAnnotationControllerProps } from "./types";

export type RoiAnnotationContextValue = ReturnType<typeof useRoiAnnotation>;

export function useRoiAnnotation({
  frame,
  labels,
  initialValue,
  resetKey,
  title = "ROI Annotation",
  subtitle,
  loading = false,
  error = null,
  initialBrushSize = 10,
  initialOverlayOpacity = 0.2,
  onClose,
  onSave,
  onLabelsChange,
  annotationInteractive = true,
}: RoiAnnotationControllerProps) {
  const initialSnapshotRef = useRef<RoiAnnotationValue>({
    classificationLabelId: initialValue.classificationLabelId,
    mask: coerceMask(initialValue.mask, frame.width, frame.height),
  });
  const [historyState, setHistoryState] = useState<{
    history: RoiAnnotationValue[];
    index: number;
    previewMask: Uint8Array | null;
  }>({
    history: [cloneAnnotationValue(initialSnapshotRef.current)],
    index: 0,
    previewMask: null,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [tool, setTool] = useState<"brush" | "erase">("brush");
  const [brushSize, setBrushSize] = useState(initialBrushSize);
  const [overlayOpacity, setOverlayOpacity] = useState(initialOverlayOpacity);
  const [activePaintLabelId, setActivePaintLabelId] = useState<string | null>(labels?.[0]?.id ?? null);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [labelSaveState, setLabelSaveState] = useState<{
    saving: boolean;
    error: string | null;
  }>({
    saving: false,
    error: null,
  });
  const [localLabels, setLocalLabels] = useState<AnnotationLabel[]>(labels ?? []);
  const [annotationInstances, setAnnotationInstances] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const annotationMode = useAnnotationModeStore((state) => state.mode);

  useEffect(() => {
    setLocalLabels(labels ?? []);
  }, [labels]);

  useEffect(() => {
    if (annotationMode !== "instance") {
      setAnnotationInstances([]);
      setActiveInstanceId(null);
    }
  }, [annotationMode]);

  useEffect(() => {
    const nextInitial = {
      classificationLabelId: initialValue.classificationLabelId,
      mask: coerceMask(initialValue.mask, frame.width, frame.height),
    } satisfies RoiAnnotationValue;
    initialSnapshotRef.current = cloneAnnotationValue(nextInitial);
    setHistoryState({
      history: [cloneAnnotationValue(nextInitial)],
      index: 0,
      previewMask: null,
    });
    setSaveError(null);
  }, [frame.height, frame.width, initialValue.classificationLabelId, initialValue.mask, resetKey]);

  useEffect(() => {
    if (localLabels.length === 0) {
      setActivePaintLabelId(null);
      return;
    }
    if (!activePaintLabelId || !localLabels.some((label) => label.id === activePaintLabelId)) {
      setActivePaintLabelId(localLabels[0]?.id ?? null);
    }
  }, [activePaintLabelId, localLabels]);

  const currentSnapshot = historyState.history[historyState.index] ?? initialSnapshotRef.current;
  const effectiveMask = historyState.previewMask ?? currentSnapshot.mask;
  const labelManagerOpenable = Boolean(onLabelsChange) && !loading;
  const canManageLabels = !loading && !error && Boolean(onLabelsChange);
  const canEdit =
    annotationInteractive && !loading && !error && localLabels.length > 0;
  const canEditClassification = useMemo(
    () => canEdit && annotationMode === "classification",
    [annotationMode, canEdit],
  );
  const canEditPaint = useMemo(
    () =>
      canEdit &&
      annotationMode !== "classification" &&
      (annotationMode !== "instance" || activeInstanceId !== null),
    [activeInstanceId, annotationMode, canEdit],
  );
  const dirty = useMemo(
    () => !annotationValuesEqual(currentSnapshot, initialSnapshotRef.current),
    [currentSnapshot],
  );
  const selectedClassificationLabel = localLabels.find(
    (label) => label.id === currentSnapshot.classificationLabelId,
  );
  const commitSnapshot = useCallback((nextSnapshot: RoiAnnotationValue) => {
    setHistoryState((current) => {
      const active = current.history[current.index] ?? initialSnapshotRef.current;
      if (annotationValuesEqual(active, nextSnapshot)) {
        return { ...current, previewMask: null };
      }
      const history = current.history
        .slice(0, current.index + 1)
        .map((snapshot) => cloneAnnotationValue(snapshot));
      history.push(cloneAnnotationValue(nextSnapshot));
      return {
        history,
        index: history.length - 1,
        previewMask: null,
      };
    });
  }, []);

  const requestClose = useCallback(() => {
    if (dirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && labelManagerOpen) {
        event.preventDefault();
        setLabelManagerOpen(false);
        return;
      }
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (modifierPressed && event.key.toLowerCase() === "z") {
        event.preventDefault();
        setHistoryState((current) => {
          if (event.shiftKey) {
            if (current.index >= current.history.length - 1) return current;
            return { ...current, index: current.index + 1, previewMask: null };
          }
          if (current.index <= 0) return current;
          return { ...current, index: current.index - 1, previewMask: null };
        });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [labelManagerOpen, requestClose]);

  const handleClassificationChange = useCallback(
    (labelId: string | null) => {
      commitSnapshot({
        classificationLabelId:
          currentSnapshot.classificationLabelId === labelId ? null : labelId,
        mask: currentSnapshot.mask.slice(),
      });
    },
    [commitSnapshot, currentSnapshot],
  );

  const handleClearMask = useCallback(() => {
    commitSnapshot({
      classificationLabelId: currentSnapshot.classificationLabelId,
      mask: createEmptyMask(frame.width, frame.height),
    });
  }, [commitSnapshot, currentSnapshot.classificationLabelId, frame.height, frame.width]);

  const handleSave = useCallback(async () => {
    if (!canEdit || saving || loading) return;
    setSaving(true);
    setSaveError(null);
    try {
      const nextValue = cloneAnnotationValue(currentSnapshot);
      await onSave(nextValue);
      initialSnapshotRef.current = cloneAnnotationValue(nextValue);
      setHistoryState({
        history: [cloneAnnotationValue(nextValue)],
        index: 0,
        previewMask: null,
      });
    } catch (saveIssue) {
      setSaveError(
        saveIssue instanceof Error ? saveIssue.message : "Failed to save ROI annotation",
      );
    } finally {
      setSaving(false);
    }
  }, [canEdit, currentSnapshot, loading, onSave, saving]);

  const commitAnnotationLabels = useCallback(
    async (nextLabels: AnnotationLabel[]): Promise<boolean> => {
      if (!onLabelsChange || labelSaveState.saving) return false;
      setLabelSaveState({ saving: true, error: null });
      try {
        const resolved = (await onLabelsChange(nextLabels)) ?? nextLabels;
        setLocalLabels(resolved);
        setActivePaintLabelId((current) => current ?? resolved[0]?.id ?? null);
        setLabelSaveState({ saving: false, error: null });
        return true;
      } catch (labelIssue) {
        setLabelSaveState({
          saving: false,
          error:
            labelIssue instanceof Error ? labelIssue.message : "Failed to save annotation labels",
        });
        return false;
      }
    },
    [labelSaveState.saving, onLabelsChange],
  );

  const setPreviewMask = useCallback((nextMask: Uint8Array) => {
    setHistoryState((current) => ({ ...current, previewMask: nextMask.slice() }));
  }, []);

  const clearStrokeError = useCallback(() => setSaveError(null), []);

  const commitStroke = useCallback(
    (nextMask: Uint8Array) => {
      commitSnapshot({
        classificationLabelId: currentSnapshot.classificationLabelId,
        mask: nextMask.slice(),
      });
    },
    [commitSnapshot, currentSnapshot.classificationLabelId],
  );

  const addAnnotationInstance = useCallback(() => {
    const id = crypto.randomUUID();
    setAnnotationInstances((prev) => [...prev, { id, name: `Object ${prev.length + 1}` }]);
    setActiveInstanceId(id);
  }, []);

  const removeAnnotationInstance = useCallback((instanceId: string) => {
    setAnnotationInstances((prev) => prev.filter((entry) => entry.id !== instanceId));
    setActiveInstanceId((current) => (current === instanceId ? null : current));
  }, []);

  return {
    frame,
    title,
    subtitle,
    loading,
    error,
    localLabels,
    effectiveMask,
    currentSnapshot,
    labelManagerOpenable,
    canManageLabels,
    canEdit,
    canEditClassification,
    canEditPaint,
    annotationMode,
    annotationInstances,
    activeInstanceId,
    setActiveInstanceId,
    addAnnotationInstance,
    removeAnnotationInstance,
    dirty,
    saving,
    saveError,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    overlayOpacity,
    setOverlayOpacity,
    activePaintLabelId,
    setActivePaintLabelId,
    selectedClassificationLabel,
    labelManagerOpen,
    setLabelManagerOpen,
    labelSaveState,
    setLabelSaveState,
    discardConfirmOpen,
    setDiscardConfirmOpen,
    handleClassificationChange,
    handleClearMask,
    handleSave,
    commitAnnotationLabels,
    requestClose,
    setPreviewMask,
    clearStrokeError,
    commitStroke,
    onClose,
  };
}

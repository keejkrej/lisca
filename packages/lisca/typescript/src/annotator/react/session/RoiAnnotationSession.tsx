import type {
  AnnotationLabel,
  FrameResult,
  RoiFrameAnnotation,
  RoiFrameRequest,
  RoiIndexEntry,
  ViewerDataPort,
} from "lisca/viewer/contracts";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  AnnotationLabelManagerDialog,
  RoiAnnotationDiscardDialog,
  RoiAnnotationProvider,
  createEmptyMask,
  decodeMaskBase64Png,
  encodeMaskToBase64Png,
  type RoiAnnotationValue,
} from "../annotation";
import { toErrorMessage } from "../../../viewer/react/app/viewerEffects";

export interface RoiAnnotationSessionProps {
  workspacePath: string;
  backend: ViewerDataPort;
  roi: RoiIndexEntry;
  request: RoiFrameRequest;
  frame: FrameResult;
  labels: AnnotationLabel[] | null;
  labelsLoading: boolean;
  labelsError: string | null;
  onClose: () => void;
  onLabelsChange: (labels: AnnotationLabel[]) => void;
  onSaved: (annotation: RoiFrameAnnotation) => void;
  /** When false, skip loading/saving annotation from disk (e.g. real frame not ready yet). */
  annotationLoadEnabled?: boolean;
  /** Frame load error from the host app (e.g. loadRoiFrame failed). */
  frameLoadError?: string | null;
  /** Center column + right toolbar (use `display: contents` wrapper for grid placement). */
  children: ReactNode;
}

export default function RoiAnnotationSession({
  workspacePath,
  backend,
  roi,
  request,
  frame,
  labels,
  labelsLoading,
  labelsError,
  onClose,
  onLabelsChange,
  onSaved,
  annotationLoadEnabled = true,
  frameLoadError = null,
  children,
}: RoiAnnotationSessionProps) {
  const [initialValue, setInitialValue] = useState<RoiAnnotationValue>({
    classificationLabelId: null,
    mask: createEmptyMask(frame.width, frame.height),
  });
  const [resetKey, setResetKey] = useState(0);
  const [loadState, setLoadState] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: annotationLoadEnabled,
    error: null,
  });

  useEffect(() => {
    if (!annotationLoadEnabled) {
      setLoadState({ loading: false, error: null });
      setInitialValue({
        classificationLabelId: null,
        mask: createEmptyMask(frame.width, frame.height),
      });
      setResetKey((current) => current + 1);
      return;
    }

    let cancelled = false;
    setLoadState({ loading: true, error: null });

    void (async () => {
      try {
        const loaded = await backend.loadRoiFrameAnnotation(workspacePath, request);
        const mask = loaded.maskBase64Png
          ? await decodeMaskBase64Png(loaded.maskBase64Png, frame.width, frame.height)
          : createEmptyMask(frame.width, frame.height);
        if (cancelled) return;
        setInitialValue({
          classificationLabelId: loaded.annotation.classificationLabelId ?? null,
          mask,
        });
        setResetKey((current) => current + 1);
        setLoadState({ loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setInitialValue({
          classificationLabelId: null,
          mask: createEmptyMask(frame.width, frame.height),
        });
        setResetKey((current) => current + 1);
        setLoadState({ loading: false, error: toErrorMessage(error) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [annotationLoadEnabled, backend, frame.height, frame.width, request, workspacePath]);

  const editorSubtitle = useMemo(
    () =>
      `P${request.pos} · C${request.channel} · T${request.time} · Z${request.z} · ${frame.width}×${frame.height}`,
    [frame.height, frame.width, request.channel, request.pos, request.time, request.z],
  );

  return (
    <RoiAnnotationProvider
      frame={frame}
      labels={labels}
      initialValue={initialValue}
      resetKey={resetKey}
      title={`ROI ${roi.roi}`}
      subtitle={editorSubtitle}
      loading={loadState.loading || labelsLoading}
      error={frameLoadError ?? loadState.error ?? labelsError}
      onClose={onClose}
      annotationInteractive={annotationLoadEnabled}
      onSave={async (value) => {
        if (!annotationLoadEnabled) return;
        const payload = {
          classificationLabelId: value.classificationLabelId,
          maskBase64Png: value.mask.some((pixel) => pixel !== 0)
            ? await encodeMaskToBase64Png(value.mask, frame.width, frame.height)
            : null,
        };
        const saved = await backend.saveRoiFrameAnnotation(workspacePath, request, payload);
        onSaved(saved);
      }}
      onLabelsChange={async (nextLabels) => {
        const savedLabels = await backend.saveAnnotationLabels(workspacePath, nextLabels);
        onLabelsChange(savedLabels);
        return savedLabels;
      }}
    >
      {children}
      <AnnotationLabelManagerDialog />
      <RoiAnnotationDiscardDialog />
    </RoiAnnotationProvider>
  );
}

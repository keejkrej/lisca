import type {
  AnnotationLabel,
  FrameResult,
  RawFrameAnnotation,
  RawFrameRequest,
  ViewerDataPort,
  ViewerSource,
} from "lisca/shared/contracts";
import { toErrorMessage } from "lisca/shared/react";
import {
  useSaveAnnotationLabelsMutation,
  useSaveRawFrameAnnotationMutation,
} from "lisca/shared/query";
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

export interface RawAnnotationSessionProps {
  workspacePath: string;
  source: ViewerSource;
  backend: ViewerDataPort;
  request: RawFrameRequest;
  frame: FrameResult;
  labels: AnnotationLabel[] | null;
  labelsLoading: boolean;
  labelsError: string | null;
  onClose: () => void;
  onLabelsChange: (labels: AnnotationLabel[]) => void;
  onSaved: (annotation: RawFrameAnnotation) => void;
  annotationLoadEnabled?: boolean;
  frameLoadError?: string | null;
  children: ReactNode;
}

export default function RawAnnotationSession({
  workspacePath,
  source,
  backend,
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
}: RawAnnotationSessionProps) {
  const saveRawMutation = useSaveRawFrameAnnotationMutation(backend);
  const saveLabelsMutation = useSaveAnnotationLabelsMutation(backend);

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
        const loaded = await backend.loadRawFrameAnnotation(workspacePath, source, request);
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
  }, [annotationLoadEnabled, backend, frame.height, frame.width, request, source, workspacePath]);

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
      title="Raw Frame"
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
        const saved = await saveRawMutation.mutateAsync({
          workspacePath,
          source,
          request,
          annotation: payload,
        });
        onSaved(saved);
      }}
      onLabelsChange={async (nextLabels) => {
        const savedLabels = await saveLabelsMutation.mutateAsync({
          workspacePath,
          labels: nextLabels,
        });
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

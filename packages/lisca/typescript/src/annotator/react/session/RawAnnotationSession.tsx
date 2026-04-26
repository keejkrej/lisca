import type {
  AnnotationLabel,
  FrameResult,
  RawFrameAnnotation,
  RawFrameRequest,
  ViewerDataPort,
  ViewerSource,
} from "lisca/shared/contracts";
import {
  useSaveAnnotationLabelsMutation,
  useSaveRawFrameAnnotationMutation,
} from "lisca/shared/query";
import type { ReactNode } from "react";
import { useMemo } from "react";

import {
  AnnotationLabelManagerDialog,
  RoiAnnotationDiscardDialog,
  RoiAnnotationProvider,
  encodeMaskToBase64Png,
} from "../annotation";
import { useLoadFrameAnnotationForEditor } from "../hooks/useLoadFrameAnnotationForEditor";

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

  const { initialValue, resetKey, loadState } = useLoadFrameAnnotationForEditor({
    annotationLoadEnabled,
    workspacePath,
    backend,
    frameWidth: frame.width,
    frameHeight: frame.height,
    mode: "raw",
    roiRequest: null,
    rawRequest: request,
    rawSource: source,
  });

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

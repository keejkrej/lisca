import type {
  AnnotationLabel,
  FrameResult,
  RoiFrameAnnotation,
  RoiFrameRequest,
  RoiIndexEntry,
  ViewerDataPort,
} from "lisca/shared/contracts";
import {
  useSaveAnnotationLabelsMutation,
  useSaveRoiFrameAnnotationMutation,
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
  const saveRoiMutation = useSaveRoiFrameAnnotationMutation(backend);
  const saveLabelsMutation = useSaveAnnotationLabelsMutation(backend);

  const { initialValue, resetKey, loadState } = useLoadFrameAnnotationForEditor({
    annotationLoadEnabled,
    workspacePath,
    backend,
    frameWidth: frame.width,
    frameHeight: frame.height,
    mode: "roi",
    roiRequest: request,
    rawRequest: null,
    rawSource: null,
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
        const saved = await saveRoiMutation.mutateAsync({
          workspacePath,
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

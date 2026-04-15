import type {
  AnnotationLabel,
  FrameResult,
  RoiFrameAnnotation,
  RoiFrameRequest,
  RoiIndexEntry,
  ViewerDataPort,
} from "lisca/viewer/contracts";
import {
  RoiAnnotationEditor,
  createEmptyMask,
  decodeMaskBase64Png,
  encodeMaskToBase64Png,
  type RoiAnnotationValue,
} from "../annotation";
import { useEffect, useMemo, useState } from "react";

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
  /** Applied to the outer container around the editor (layout / sizing). */
  className?: string;
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
  className = "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-2xl",
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
    loading: true,
    error: null,
  });

  useEffect(() => {
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
  }, [backend, frame.height, frame.width, request, workspacePath]);

  const editorSubtitle = useMemo(
    () =>
      `Pos${request.pos} | C${request.channel} | T${request.time} | Z${request.z} | ${frame.width} x ${frame.height}`,
    [frame.height, frame.width, request.channel, request.pos, request.time, request.z],
  );

  return (
    <div
      className={className}
      role="region"
      aria-label={`ROI ${roi.roi} Annotation`}
    >
      <RoiAnnotationEditor
        frame={frame}
        labels={labels}
        initialValue={initialValue}
        resetKey={resetKey}
        title={`ROI ${roi.roi} Annotation`}
        subtitle={editorSubtitle}
        loading={loadState.loading || labelsLoading}
        error={loadState.error ?? labelsError}
        onClose={onClose}
        className="min-h-0 flex-1"
        onSave={async (value) => {
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
      />
    </div>
  );
}

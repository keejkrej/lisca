import {
  AnnotationCanvas,
  SmartSegmentModelDialog,
  ViewportCard,
} from "@lisca/ui-native";
import { useSmartSegment } from "@lisca/smart/segment/browser";
import { useState } from "react";

import type { useAnnotateState } from "../state/use-annotate-state";

type AnnotateState = ReturnType<typeof useAnnotateState>;

export function AnnotatorMain({ state }: { state: AnnotateState }) {
  const classificationLabelId = state.annotation.current.classificationLabelId;
  const [smartSegmentStatus, setSmartSegmentStatus] = useState<string | null>(null);
  const [smartSegmentError, setSmartSegmentError] = useState<string | null>(null);
  const activeLabelValue = state.labels.findIndex((label) => label.id === state.activeLabelId) + 1;
  const onMaskCommit = (mask: Uint8Array) => {
    state.annotation.commit({
      classificationLabelId,
      mask,
    });
  };
  const smartSegment = useSmartSegment({
    frame: state.frame,
    tool: state.tool,
    activeLabelValue,
    mask: state.annotation.current.mask,
    enabled: state.canEditSegmentation,
    onCommit: onMaskCommit,
    onStatus: setSmartSegmentStatus,
    onError: setSmartSegmentError,
  });
  const toasts = smartSegmentError
    ? [{ text: smartSegmentError, tone: "error" as const }]
    : smartSegmentStatus
      ? [...state.canvasToasts, { text: smartSegmentStatus }]
      : state.canvasToasts;

  return (
    <ViewportCard>
      <SmartSegmentModelDialog
        busy={smartSegment.busy}
        state={smartSegment.downloadState}
        onCancel={smartSegment.cancelDownload}
        onConfirm={() => void smartSegment.confirmDownload()}
      />
      <AnnotationCanvas
        activeLabelId={state.activeLabelId}
        brushSize={state.brushSize}
        disabled={!state.canEditSegmentation || smartSegment.busy}
        frame={state.frame}
        labels={state.labels}
        mask={state.annotation.current.mask}
        overlayOpacity={state.overlayOpacity}
        smartSegmentPrompts={smartSegment.prompts}
        toasts={toasts}
        tool={state.tool}
        onMaskCommit={onMaskCommit}
        onSmartSegmentClick={(click) => void smartSegment.handleClick(click)}
        onSmartEraseClick={(click) => void smartSegment.handleEraseClick(click)}
      />
    </ViewportCard>
  );
}

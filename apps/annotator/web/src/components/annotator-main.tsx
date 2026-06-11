import { AnnotationCanvas } from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { useSmartSegment } from "@lisca/segmentation/browser";
import { useMemo, useState } from "react";
import { useAnnotatePage } from "../state/annotate-page-context";

export function AnnotatorMain() {
  const { state } = useAnnotatePage();
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
  const toasts = useMemo(() => {
    if (smartSegmentError) {
      return [{ text: smartSegmentError, tone: "error" as const }];
    }
    const base = state.canvasToasts;
    if (smartSegmentStatus) {
      return [...base, { text: smartSegmentStatus }];
    }
    return base;
  }, [smartSegmentError, smartSegmentStatus, state.canvasToasts]);
  return (
    <ViewportCard>
      <AnnotationCanvas
        activeLabelId={state.activeLabelId}
        brushSize={state.brushSize}
        className="min-h-0 flex-1"
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
      />
    </ViewportCard>
  );
}

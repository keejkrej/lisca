import { AnnotationCanvas, SmartSegmentModelDialog } from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { useSmartSegment } from "@lisca/smart/segment/browser";
import { useState } from "react";

import { useAnnotateCanvas } from "../state/annotate-page-selectors";

export function AnnotatorMain() {
  const canvas = useAnnotateCanvas();
  const classificationLabelId = canvas.annotation.current.classificationLabelId;
  const [smartSegmentStatus, setSmartSegmentStatus] = useState<string | null>(null);
  const [smartSegmentError, setSmartSegmentError] = useState<string | null>(null);
  const activeLabelValue =
    canvas.labels.findIndex((label) => label.id === canvas.activeLabelId) + 1;
  const onMaskCommit = (mask: Uint8Array) => {
    canvas.annotation.commit({
      classificationLabelId,
      mask,
    });
  };
  const smartSegment = useSmartSegment({
    frame: canvas.frame,
    tool: canvas.tool,
    activeLabelValue,
    mask: canvas.annotation.current.mask,
    enabled: canvas.canEditSegmentation,
    onCommit: onMaskCommit,
    onStatus: setSmartSegmentStatus,
    onError: setSmartSegmentError,
  });
  const toasts = smartSegmentError
    ? [{ text: smartSegmentError, tone: "error" as const }]
    : smartSegmentStatus
      ? [...canvas.canvasToasts, { text: smartSegmentStatus }]
      : canvas.canvasToasts;

  return (
    <ViewportCard>
      <SmartSegmentModelDialog
        busy={smartSegment.busy}
        state={smartSegment.downloadState}
        onCancel={smartSegment.cancelDownload}
        onConfirm={() => void smartSegment.confirmDownload()}
      />
      <AnnotationCanvas
        activeLabelId={canvas.activeLabelId}
        brushSize={canvas.brushSize}
        className="min-h-0 flex-1"
        disabled={!canvas.canEditSegmentation || smartSegment.busy}
        frame={canvas.frame}
        labels={canvas.labels}
        mask={canvas.annotation.current.mask}
        overlayOpacity={canvas.overlayOpacity}
        smartSegmentPrompts={smartSegment.prompts}
        toasts={toasts}
        tool={canvas.tool}
        onMaskCommit={onMaskCommit}
        onSmartSegmentClick={(click) => void smartSegment.handleClick(click)}
        onSmartEraseClick={(click) => void smartSegment.handleEraseClick(click)}
      />
    </ViewportCard>
  );
}

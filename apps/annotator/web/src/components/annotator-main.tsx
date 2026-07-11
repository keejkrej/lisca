import type { AnnotationLabel } from "@lisca/contracts";
import { runClientEffect } from "@lisca/client/runtime";
import { useSmartSegment } from "@lisca/smart/segment";
import { createRequestSmartSegmentProvider } from "@lisca/smart/segment/request";
import { AnnotationCanvas } from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { createSignal } from "solid-js";

import { annotatorClient } from "../api/annotator-port";
import { useAnnotatePage } from "../state/annotate-page-context";
import { useAnnotateCanvas } from "../state/annotate-page-selectors";

export function AnnotatorMain() {
  const { state } = useAnnotatePage();
  const canvas = useAnnotateCanvas();
  const smartSegmentProvider = createRequestSmartSegmentProvider(
    {
      smartSegment: (request, signal) =>
        runClientEffect(
          annotatorClient.smartSegment(request, signal),
          signal ? { signal } : undefined,
        ),
    },
    {
      workspacePath: () => state.workspacePath,
      roiRequest: () => state.request,
      contrast: () => state.contrast,
    },
  );
  const classificationLabelId = canvas.annotation.current.classificationLabelId;
  const [smartSegmentStatus, setSmartSegmentStatus] = createSignal<string | null>(null);
  const [smartSegmentError, setSmartSegmentError] = createSignal<string | null>(null);
  const activeLabelValue =
    canvas.labels.findIndex((label: AnnotationLabel) => label.id === canvas.activeLabelId) + 1;
  const onMaskCommit = (mask: Uint8Array) => {
    canvas.annotation.commit({
      classificationLabelId,
      mask,
    });
  };
  const smartSegment = useSmartSegment({
    provider: smartSegmentProvider,
    frame: canvas.frame,
    tool: canvas.tool,
    activeLabelValue,
    mask: canvas.annotation.current.mask,
    enabled: canvas.canEditSegmentation,
    onCommit: onMaskCommit,
    onStatus: setSmartSegmentStatus,
    onError: setSmartSegmentError,
  });
  const toasts = smartSegmentError()
    ? [{ text: smartSegmentError()!, tone: "error" as const }]
    : smartSegmentStatus()
      ? [...canvas.canvasToasts, { text: smartSegmentStatus()! }]
      : canvas.canvasToasts;

  return (
    <ViewportCard>
      <AnnotationCanvas
        activeLabelId={canvas.activeLabelId}
        brushSize={canvas.brushSize}
        class="min-h-0 flex-1"
        disabled={!canvas.canEditSegmentation || smartSegment.busy()}
        frame={canvas.frame}
        labels={canvas.labels}
        mask={canvas.annotation.current.mask}
        overlayOpacity={canvas.overlayOpacity}
        smartSegmentPrompts={smartSegment.prompts()}
        toasts={toasts}
        tool={canvas.tool}
        onMaskCommit={onMaskCommit}
        onSmartSegmentClick={(click) => void smartSegment.handleClick(click)}
        onSmartEraseClick={(click) => void smartSegment.handleEraseClick(click)}
      />
    </ViewportCard>
  );
}
import type { AnnotationLabel } from "@lisca/contracts";
import { runClientEffect } from "@lisca/client/runtime";
import { useSmartSegment } from "@lisca/smart/segment";
import { createRequestSmartSegmentProvider } from "@lisca/smart/segment/request";
import { AnnotationCanvas } from "@lisca/ui/features";
import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import { createMemo, createSignal } from "solid-js";

import { annotatorClient } from "../api/annotator-port";
import { useAnnotatePage } from "../state/annotate-page-context";
import { useAnnotateCanvas, useAnnotateNav } from "../state/annotate-page-selectors";

export function AnnotatorMain() {
  const { state } = useAnnotatePage();
  const canvas = useAnnotateCanvas();
  const nav = useAnnotateNav();
  const smartSegmentProvider = createRequestSmartSegmentProvider(
    {
      smartSegment: (request, signal) =>
        runClientEffect(annotatorClient.smartSegment(request), signal ? { signal } : undefined),
    },
    {
      workspacePath: () => state.workspacePath,
      roiRequest: () => state.request,
      contrast: () => state.contrast,
    },
  );
  const [smartSegmentStatus, setSmartSegmentStatus] = createSignal<string | null>(null);
  const [smartSegmentError, setSmartSegmentError] = createSignal<string | null>(null);
  const activeLabelValue = createMemo(
    () =>
      canvas.labels.findIndex((label: AnnotationLabel) => label.id === canvas.activeLabelId) + 1,
  );
  const onMaskCommit = (mask: Uint8Array) => {
    canvas.annotation.commit({
      classificationLabelId: canvas.annotation.current.classificationLabelId,
      mask,
    });
  };
  const smartSegment = useSmartSegment({
    provider: smartSegmentProvider,
    frame: () => canvas.frame,
    tool: () => canvas.tool,
    activeLabelValue,
    mask: () => canvas.annotation.current.mask,
    enabled: () => canvas.canEditSegmentation,
    onCommit: onMaskCommit,
    onStatus: setSmartSegmentStatus,
    onError: setSmartSegmentError,
  });
  const toasts = createMemo(() =>
    smartSegmentError()
      ? [{ text: smartSegmentError()!, tone: "error" as const }]
      : smartSegmentStatus()
        ? [...canvas.canvasToasts, { text: smartSegmentStatus()! }]
        : canvas.canvasToasts,
  );

  return (
    <ViewportCard>
      <StageCanvas
        aspect="square"
        captionLeft={`Site ${nav.selection.roi ?? "—"} · Channel ${nav.selection.channel ?? "—"}`}
        captionRight={
          canvas.frame ? `${canvas.frame.width} × ${canvas.frame.height} px` : "No frame"
        }
        class="max-w-[30rem]"
      >
        <AnnotationCanvas
          activeLabelId={canvas.activeLabelId}
          brushSize={canvas.brushSize}
          class="h-full w-full"
          disabled={!canvas.canEditSegmentation || smartSegment.busy()}
          emptyText="Pick a workspace to load a frame."
          frame={canvas.frame}
          labels={canvas.labels}
          mask={canvas.annotation.current.mask}
          overlayOpacity={canvas.overlayOpacity}
          smartSegmentPrompts={smartSegment.prompts()}
          toasts={toasts()}
          tool={canvas.tool}
          onMaskCommit={onMaskCommit}
          onSmartSegmentClick={(click) => void smartSegment.handleClick(click)}
          onSmartEraseClick={(click) => void smartSegment.handleEraseClick(click)}
        />
      </StageCanvas>
    </ViewportCard>
  );
}

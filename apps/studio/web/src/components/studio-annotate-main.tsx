import { runClientEffect } from "@lisca/client/runtime";
import { useSmartSegment } from "@lisca/smart/segment";
import { createRequestSmartSegmentProvider } from "@lisca/smart/segment/request";
import { AnnotationCanvas } from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { createSignal } from "solid-js";

import { studioClient } from "../api/studio-port";
import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { useStudioAnnotateCanvas } from "../state/studio-annotate-page-selectors";
import { StudioAnalysisProgressModal } from "./studio-analysis-progress-modal";
import { StudioAnalysisStartModal } from "./studio-analysis-start-modal";

export function StudioAnnotateMain() {
  const { state } = useStudioAnnotatePage();
  const canvas = useStudioAnnotateCanvas();
  const smartSegmentProvider = createRequestSmartSegmentProvider(
    {
      smartSegment: (request, signal) =>
        runClientEffect(studioClient.smartSegment(request, signal), signal ? { signal } : undefined),
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
    canvas.labels.findIndex((label) => label.id === canvas.activeLabelId) + 1;
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

  if (state.workspaceMissing) {
    return (
      <>
        <ViewportCard class="relative">
          <div class="flex min-h-[12rem] items-center justify-center p-6 text-center text-muted-foreground text-sm">
            Set a save location in Basic info, then align and crop ROIs before annotating.
          </div>
        </ViewportCard>
        <StudioAnalysisStartModal />
        <StudioAnalysisProgressModal />
      </>
    );
  }

  if (!state.scanLoading && state.scan && state.scan.positions.length === 0) {
    return (
      <>
        <ViewportCard class="relative">
          <div class="flex min-h-[12rem] items-center justify-center p-6 text-center text-muted-foreground text-sm">
            No cropped ROI stacks found in the workspace. Complete Align pattern and crop ROIs
            first.
          </div>
        </ViewportCard>
        <StudioAnalysisStartModal />
        <StudioAnalysisProgressModal />
      </>
    );
  }

  return (
    <>
      <ViewportCard class="relative min-h-0 flex-1">
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
      <StudioAnalysisStartModal />
      <StudioAnalysisProgressModal />
    </>
  );
}
import { runClientEffect } from "@lisca/client/runtime";
import { useSmartSegment } from "@lisca/smart/segment";
import { createRequestSmartSegmentProvider } from "@lisca/smart/segment/request";
import { AnnotationCanvas, CanvasToastStack } from "@lisca/ui/features";
import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import { createMemo, createSignal, Show } from "solid-js";

import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { studioClient } from "../api/studio-port";
import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import {
  useStudioAnnotateCanvas,
  useStudioAnnotateNav,
} from "../state/studio-annotate-page-selectors";
import { StudioEmptyState } from "./studio-empty-state";

export function StudioAnnotateMain() {
  const { navigateTo } = useStudioNavigate();
  const { state } = useStudioAnnotatePage();
  const canvas = useStudioAnnotateCanvas();
  const nav = useStudioAnnotateNav();
  const smartSegmentProvider = createRequestSmartSegmentProvider(
    {
      smartSegment: (request, signal) =>
        runClientEffect(studioClient.smartSegment(request), signal ? { signal } : undefined),
    },
    {
      workspacePath: () => state.workspacePath,
      roiRequest: () => state.request,
      contrast: () => state.contrast,
    },
  );
  const [smartSegmentStatus, setSmartSegmentStatus] = createSignal<string | null>(null);
  const [smartSegmentError, setSmartSegmentError] = createSignal<string | null>(null);
  const activeLabelValue = () =>
    canvas.labels.findIndex((label) => label.id === canvas.activeLabelId) + 1;
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

  const noCroppedRois = () => {
    const scan = state.scan;
    return !state.scanLoading && scan != null && scan.positions.length === 0;
  };

  return (
    <Show
      when={noCroppedRois()}
      fallback={
        <ViewportCard>
          <StageCanvas
            notice={<CanvasToastStack messages={toasts()} />}
            captionLeft={`ROI ${nav.selection.roi ?? "—"} · Channel ${nav.selection.channel ?? "—"}`}
            captionRight={
              canvas.frame ? `${canvas.frame.width} × ${canvas.frame.height} px` : "No frame"
            }
          >
            <AnnotationCanvas
              activeLabelId={canvas.activeLabelId}
              brushSize={canvas.brushSize}
              class="h-full w-full"
              disabled={!canvas.canEditSegmentation || smartSegment.busy()}
              frame={canvas.frame}
              labels={canvas.labels}
              mask={canvas.annotation.current.mask}
              overlayOpacity={canvas.overlayOpacity}
              smartSegmentPrompts={smartSegment.prompts()}
              tool={canvas.tool}
              onMaskCommit={onMaskCommit}
              onSmartSegmentClick={(click) => void smartSegment.handleClick(click)}
              onSmartEraseClick={(click) => void smartSegment.handleEraseClick(click)}
            />
          </StageCanvas>
        </ViewportCard>
      }
    >
      <ViewportCard contentClass="relative max-w-[480px]">
        <StudioEmptyState
          actionLabel="Go to Align"
          description="Align the grid and crop ROI images first. Annotation needs those ROI stacks."
          title="No cropped ROIs"
          onAction={() => navigateTo("/align")}
        />
      </ViewportCard>
    </Show>
  );
}

import type { AnnotationLabel } from "@lisca/contracts";
import { runClientEffect } from "@lisca/client/runtime";
import { useSmartSegment } from "@lisca/smart/segment";
import { createRequestSmartSegmentProvider } from "@lisca/smart/segment/request";
import { AnnotationCanvas, CanvasToastStack } from "@lisca/instrument";
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
    frameKey: () =>
      state.request && state.workspacePath
        ? `${state.workspacePath}:${state.request.pos}:${state.request.roi}:${state.request.channel}:${state.request.time}:${state.request.z}`
        : null,
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

  const captionLeft = createMemo(() => {
    const pos = nav.selection.pos != null ? String(nav.selection.pos + 1).padStart(2, "0") : "—";
    return `Pos ${pos} · ROI ${nav.selection.roi ?? "—"} · Channel ${nav.selection.channel ?? "—"}`;
  });
  const emptyText = createMemo(() => {
    if (!state.workspacePath) return "Pick a workspace to load a frame.";
    if (state.scanLoading) return "Scanning workspace…";
    if (state.scanError) return state.scanError;
    if ((state.scan?.positions.length ?? 0) === 0) {
      return "No cropped ROIs found in this workspace.";
    }
    return "No frame loaded.";
  });

  return (
    <ViewportCard>
      <StageCanvas
        notice={<CanvasToastStack messages={toasts()} />}
        captionLeft={captionLeft()}
        captionRight={
          canvas.frame ? `${canvas.frame.width} × ${canvas.frame.height} px` : "No frame"
        }
      >
        <AnnotationCanvas
          activeLabelId={canvas.activeLabelId}
          brushSize={canvas.brushSize}
          class="h-full w-full"
          disabled={!canvas.canEditSegmentation || smartSegment.busy()}
          emptyText={emptyText()}
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
  );
}

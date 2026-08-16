import type { AnnotationLabel } from "@lisca/contracts";
import { runClientEffect } from "@lisca/client/runtime";
import { useSmartSegment } from "@lisca/smart/segment";
import { createRequestSmartSegmentProvider } from "@lisca/smart/segment/request";
import { AnnotationCanvas } from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
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
    get frame() {
      return canvas.frame;
    },
    get tool() {
      return canvas.tool;
    },
    get activeLabelValue() {
      return activeLabelValue();
    },
    get mask() {
      return canvas.annotation.current.mask;
    },
    get enabled() {
      return canvas.canEditSegmentation;
    },
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
    <ViewportCard variant="stage">
      <div class="flex h-full w-full max-w-[30rem] flex-col justify-center gap-3 self-center">
        <div class="aspect-square w-full overflow-hidden rounded-2xl bg-muted">
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
        </div>
        <div class="flex items-center justify-between gap-4 px-1 text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
          <span>
            Site {nav.selection.roi ?? "—"} · Channel {nav.selection.channel ?? "—"}
          </span>
          <span>
            {canvas.frame ? `${canvas.frame.width} × ${canvas.frame.height} px` : "No frame"}
          </span>
        </div>
      </div>
    </ViewportCard>
  );
}

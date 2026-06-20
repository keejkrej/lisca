import { ViewportCard } from "@lisca/ui/shell";
import {
  AnnotationCanvas,
  SmartSegmentModelDialog,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { useSmartSegment } from "@lisca/smart/segment/browser";
import { toDisplayFrame } from "@lisca/web-demo/browser";
import { useState } from "react";
import type { DemoAnnotatorState } from "@lisca/web-demo";

export function DemoAnnotatorMain({
  state,
  embedded = false,
}: {
  state: DemoAnnotatorState;
  embedded?: boolean;
}) {
  const displayFrame = state.frame ? toDisplayFrame(state.frame, state.contrast) : null;
  const visibleStatus = useCanvasTransientStatus(state.status);
  const [smartSegmentStatus, setSmartSegmentStatus] = useState<string | null>(null);
  const [smartSegmentError, setSmartSegmentError] = useState<string | null>(null);
  const activeLabelValue = state.labels.findIndex((label) => label.id === state.activeLabelId) + 1;
  const smartSegment = useSmartSegment({
    frame: displayFrame,
    tool: state.tool,
    activeLabelValue,
    mask: state.annotation.current.mask,
    enabled: state.canEditSegmentation,
    onCommit: (mask) =>
      state.annotation.commit({
        classificationLabelId: state.annotation.current.classificationLabelId,
        mask,
      }),
    onStatus: setSmartSegmentStatus,
    onError: setSmartSegmentError,
  });
  const activeToastStatus = state.frameLoading ? "Loading image" : visibleStatus;
  const toasts = embedded
    ? []
    : smartSegmentError
      ? [{ text: smartSegmentError, tone: "error" as const }]
      : state.error
        ? [{ text: state.error, tone: "error" as const }]
        : smartSegmentStatus
          ? [{ text: smartSegmentStatus }]
          : activeToastStatus
            ? [{ text: activeToastStatus }]
            : [];
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
        className="min-h-0 flex-1"
        disabled={!state.canEditSegmentation || smartSegment.busy}
        frame={displayFrame}
        labels={state.labels}
        mask={state.annotation.current.mask}
        overlayOpacity={state.overlayOpacity}
        smartSegmentPrompts={smartSegment.prompts}
        toasts={toasts}
        tool={state.tool}
        onMaskCommit={(mask) =>
          state.annotation.commit({
            classificationLabelId: state.annotation.current.classificationLabelId,
            mask,
          })
        }
        onSmartSegmentClick={(click) => void smartSegment.handleClick(click)}
        onSmartEraseClick={(click) => void smartSegment.handleEraseClick(click)}
      />
    </ViewportCard>
  );
}

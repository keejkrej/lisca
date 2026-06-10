import { ViewportCard } from "@lisca/ui/shell";
import { AnnotationCanvas, useCanvasTransientStatus } from "@lisca/ui/features";
import { toDisplayFrame } from "@lisca/browser-frame";
import type { DemoAnnotatorState } from "../state/use-demo-annotator-state";
export function DemoAnnotatorMain({ state }: { state: DemoAnnotatorState }) {
  const displayFrame = state.frame ? toDisplayFrame(state.frame, state.contrast) : null;
  const visibleStatus = useCanvasTransientStatus(state.status);
  const activeToastStatus = state.frameLoading ? "Loading image" : visibleStatus;
  const toasts = (() => {
    if (state.error)
      return [
        {
          text: state.error,
          tone: "error" as const,
        },
      ];
    if (activeToastStatus)
      return [
        {
          text: activeToastStatus,
        },
      ];
    return [];
  })();
  return (
    <ViewportCard>
      <AnnotationCanvas
        activeLabelId={state.activeLabelId}
        brushSize={state.brushSize}
        className="min-h-0 flex-1"
        disabled={!state.canEditSegmentation}
        emptyText={state.frame ? "No frame loaded." : "Open an image to begin."}
        frame={displayFrame}
        labels={state.labels}
        mask={state.annotation.current.mask}
        overlayOpacity={state.overlayOpacity}
        toasts={toasts}
        tool={state.tool}
        onMaskCommit={(mask) =>
          state.annotation.commit({
            classificationLabelId: state.annotation.current.classificationLabelId,
            mask,
          })
        }
      />
    </ViewportCard>
  );
}

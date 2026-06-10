import { AnnotationCanvas } from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { useAnnotatePage } from "../state/annotate-page-context";
export function AnnotatorMain() {
  const { state } = useAnnotatePage();
  const classificationLabelId = state.annotation.current.classificationLabelId;
  const onMaskCommit = (mask: Uint8Array) => {
    state.annotation.commit({
      classificationLabelId,
      mask,
    });
  };
  return (
    <ViewportCard>
      <AnnotationCanvas
        activeLabelId={state.activeLabelId}
        brushSize={state.brushSize}
        className="min-h-0 flex-1"
        disabled={!state.canEditSegmentation}
        frame={state.frame}
        labels={state.labels}
        mask={state.annotation.current.mask}
        overlayOpacity={state.overlayOpacity}
        toasts={state.canvasToasts}
        tool={state.tool}
        onMaskCommit={onMaskCommit}
      />
    </ViewportCard>
  );
}

import { AnnotationCanvas } from "@lisca/ui/features";
import { ViewportCard } from "@lisca/ui/shell";
import { useCallback } from "react";

import { useRoiPage } from "../state/roi-page-context";

export function AnnotatorMain() {
  const { page } = useRoiPage();
  const classificationLabelId = page.annotation.current.classificationLabelId;

  const onMaskCommit = useCallback(
    (mask: Uint8Array) => {
      page.annotation.commit({
        classificationLabelId,
        mask,
      });
    },
    [classificationLabelId, page.annotation.commit],
  );

  return (
    <ViewportCard>
      <AnnotationCanvas
        activeLabelId={page.activeLabelId}
        brushSize={page.brushSize}
        className="min-h-0 flex-1"
        disabled={!page.canEditSegmentation}
        frame={page.frame}
        labels={page.labels}
        mask={page.annotation.current.mask}
        overlayOpacity={page.overlayOpacity}
        toasts={page.canvasToasts}
        tool={page.tool}
        onMaskCommit={onMaskCommit}
      />
    </ViewportCard>
  );
}

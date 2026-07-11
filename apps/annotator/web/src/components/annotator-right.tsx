import { AnnotationControlRail } from "@lisca/ui/features";
import { SidebarStack } from "@lisca/ui/shell";

import { useAnnotateLabels } from "../state/annotate-page-selectors";

export function AnnotatorRight() {
  const labels = useAnnotateLabels();

  return (
    <SidebarStack>
      <AnnotationControlRail
        activeLabelId={labels.activeLabelId}
        annotation={labels.annotation}
        annotationError={labels.annotationError}
        annotationLoading={labels.annotationLoading}
        brushSize={labels.brushSize}
        canEdit={labels.canEdit}
        frame={labels.frame}
        frameError={labels.frameError}
        frameLoading={labels.frameLoading}
        labels={labels.labels}
        mode={labels.mode}
        openLabelDialog={labels.openLabelDialog}
        overlayOpacity={labels.overlayOpacity}
        saveError={labels.saveError}
        scanError={labels.scanError}
        scanLoading={labels.scanLoading}
        setActiveLabelId={labels.setActiveLabelId}
        setBrushSize={labels.setBrushSize}
        setMode={labels.setMode}
        setOverlayOpacity={labels.setOverlayOpacity}
        workspacePath={labels.workspacePath}
      />
    </SidebarStack>
  );
}

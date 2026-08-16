import { AnnotationControlRail } from "@lisca/ui/features";
import { RailSidebar } from "@lisca/ui/shell";

import { useAnnotateLabels } from "../state/annotate-page-selectors";
import { AnnotatorSaveSection } from "./annotator-save-section";

export function AnnotatorRight() {
  const labels = useAnnotateLabels();

  return (
    <RailSidebar>
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
        sectionAppearance="rail"
        setActiveLabelId={labels.setActiveLabelId}
        setBrushSize={labels.setBrushSize}
        setMode={labels.setMode}
        setOverlayOpacity={labels.setOverlayOpacity}
        workspacePath={labels.workspacePath}
      />
      <AnnotatorSaveSection />
    </RailSidebar>
  );
}

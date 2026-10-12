import { AnnotationControlRail } from "@lisca/instrument";
import { RailSidebar } from "@lisca/ui/patterns";

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
        brushSize={labels.brushSize}
        canEdit={labels.canEdit}
        frame={labels.frame}
        frameError={labels.frameError}
        labels={labels.labels}
        mode={labels.mode}
        openLabelDialog={labels.openLabelDialog}
        overlayOpacity={labels.overlayOpacity}
        saveError={labels.saveError}
        scanError={labels.scanError}
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

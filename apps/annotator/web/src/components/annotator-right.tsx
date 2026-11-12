import { AnnotationControlRail, LabelFreeReferencesPanel } from "@lisca/instrument";
import { PanelSection, RailSidebar } from "@lisca/ui/patterns";

import { useAnnotateLabels } from "../state/annotate-page-selectors";
import { annotatorLabelFreeClient } from "./annotator-header";
import { AnnotatorSaveSection } from "./annotator-save-section";

export function AnnotatorRight() {
  const labels = useAnnotateLabels();

  return (
    <RailSidebar>
      <PanelSection appearance="rail" title="Instruction">
        <p class="text-xs leading-relaxed text-muted-foreground">
          Paint cell masks or assign classification labels, then save each ROI.
        </p>
      </PanelSection>
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
      <LabelFreeReferencesPanel
        client={annotatorLabelFreeClient}
        workspacePath={labels.workspacePath}
      />
      <AnnotatorSaveSection />
    </RailSidebar>
  );
}

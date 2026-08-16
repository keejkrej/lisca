import { AnnotationControlRail } from "@lisca/ui/features";
import { PanelSection } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { useStudioAnnotateLabels } from "../state/studio-annotate-page-selectors";
import { StudioAnnotateControls } from "./studio-annotate-dock";

export function StudioAnnotateRight() {
  const { state } = useStudioAnnotatePage();

  return (
    <Show
      when={!state.workspaceMissing}
      fallback={
        <PanelSection appearance="rail" title="Annotate">
          <p class="text-[13px] leading-[18px] text-muted-foreground">
            Choose a workspace on the Info step first.
          </p>
        </PanelSection>
      }
    >
      <StudioAnnotateRightContent />
      <StudioAnnotateControls showShuffle={false} />
    </Show>
  );
}

export function StudioAnnotateRightContent() {
  const labels = useStudioAnnotateLabels();

  return (
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
  );
}

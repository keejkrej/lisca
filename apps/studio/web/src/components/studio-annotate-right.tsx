import { AnnotationControlRail } from "@lisca/ui/features";
import { PanelSection, SidebarStack } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { useStudioAnnotateLabels } from "../state/studio-annotate-page-selectors";

export function StudioAnnotateRight() {
  const { state } = useStudioAnnotatePage();

  return (
    <Show
      when={!state.workspaceMissing}
      fallback={
        <SidebarStack class="p-0">
          <PanelSection title="Annotate">
            <p class="text-muted-foreground text-sm">Choose a workspace in Basic info first.</p>
          </PanelSection>
        </SidebarStack>
      }
    >
      <SidebarStack class="p-0">
        <StudioAnnotateRightContent />
      </SidebarStack>
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
      setActiveLabelId={labels.setActiveLabelId}
      setBrushSize={labels.setBrushSize}
      setMode={labels.setMode}
      setOverlayOpacity={labels.setOverlayOpacity}
      workspacePath={labels.workspacePath}
    />
  );
}

import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
  ContrastControl,
} from "@lisca/ui/features";
import { PanelSection, RailSidebar } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useAnnotateDock, useAnnotateNav } from "../state/annotate-page-selectors";
import { AnnotatorFrameNavigation } from "./annotator-frame-navigation";

export function AnnotatorLeft() {
  const nav = useAnnotateNav();
  const dock = useAnnotateDock();
  const canEditTools = () => dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = () =>
    buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools(), {
      viewable: Boolean(nav.frame),
    });

  return (
    <RailSidebar>
      <AnnotatorFrameNavigation />
      <ContrastControl
        aria-label="Contrast"
        contrast={nav.contrast}
        disabled={!nav.frame}
        frame={nav.frame}
        role="region"
        sectionAppearance="rail"
        sectionClassName="min-h-0 shrink-0"
        sectionContentClassName="flex min-h-0 flex-col"
        onContrastChange={nav.setContrast}
      />
      <Show when={dock.mode === "segmentation"}>
        <PanelSection appearance="rail" title="Tool">
          <AnnotationToolGrid
            canEditTools={canEditTools()}
            layout="rail"
            shortcutsEnabled={dock.shortcutsEnabled}
            toolActions={toolActions()}
          />
        </PanelSection>
      </Show>
    </RailSidebar>
  );
}

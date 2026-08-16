import { AnnotationToolGrid, buildAnnotationToolActions } from "@lisca/ui/features";
import { DockSection, DockStrip } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useAnnotateCanvas, useAnnotateDock } from "../state/annotate-page-selectors";
import { AnnotatorSaveSection } from "./annotator-save-section";

export function AnnotatorDock() {
  const dock = useAnnotateDock();
  const canvas = useAnnotateCanvas();
  const canEditTools = dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools, {
    viewable: Boolean(canvas.frame),
  });

  return (
    <DockStrip>
      <Show when={dock.mode === "segmentation"}>
        <DockSection title="Tool">
          <AnnotationToolGrid
            canEditTools={canEditTools}
            shortcutsEnabled={dock.shortcutsEnabled}
            toolActions={toolActions}
          />
        </DockSection>
      </Show>
      <AnnotatorSaveSection />
    </DockStrip>
  );
}

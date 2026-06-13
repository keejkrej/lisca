import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
} from "@lisca/ui/features";
import { DockSection, DockStrip } from "@lisca/ui/shell";

import { useAnnotateDock } from "../state/annotate-page-selectors";
import { AnnotatorSaveSection } from "./annotator-save-section";

export function AnnotatorDock() {
  const dock = useAnnotateDock();
  const canEditTools = dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools);

  return (
    <DockStrip>
      <DockSection title="Tool">
        {dock.mode === "segmentation" ? (
          <AnnotationToolGrid
            canEditTools={canEditTools}
            shortcutsEnabled={dock.shortcutsEnabled}
            toolActions={toolActions}
          />
        ) : (
          <div className="flex min-h-[4.5rem] w-full items-center justify-center text-muted-foreground text-xs">
            Classification
          </div>
        )}
      </DockSection>
      <AnnotatorSaveSection />
    </DockStrip>
  );
}

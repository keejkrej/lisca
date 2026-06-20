import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
  DockSection,
  DockStrip,
  dockLayoutClasses,
  dockSectionWidths,
} from "@lisca/ui-native";

import { useAnnotateDock } from "../state/annotate-page-selectors";
import { AnnotatorSaveSection } from "./annotator-save-section";

export function AnnotatorDock() {
  const dock = useAnnotateDock();
  const canEditTools = dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools);

  return (
    <DockStrip>
      {dock.mode === "segmentation" ? (
        <DockSection
          className={dockSectionWidths.tool}
          contentClassName={dockLayoutClasses.content}
          title="Tool"
        >
          <AnnotationToolGrid
            canEditTools={canEditTools}
            shortcutsEnabled={dock.shortcutsEnabled}
            toolActions={toolActions}
          />
        </DockSection>
      ) : null}
      <AnnotatorSaveSection />
    </DockStrip>
  );
}

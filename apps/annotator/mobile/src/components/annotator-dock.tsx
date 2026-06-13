import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
  DockSection,
  DockStrip,
  dockLayoutClasses,
  dockToolbarMinHeight,
  Text,
} from "@lisca/ui-native";
import { View } from "react-native";

import { useAnnotateDock } from "../state/annotate-page-selectors";
import { AnnotatorSaveSection } from "./annotator-save-section";

export function AnnotatorDock() {
  const dock = useAnnotateDock();
  const canEditTools = dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools);

  return (
    <DockStrip>
      <DockSection contentClassName={dockLayoutClasses.content} title="Tool">
        {dock.mode === "segmentation" ? (
          <AnnotationToolGrid
            canEditTools={canEditTools}
            shortcutsEnabled={dock.shortcutsEnabled}
            toolActions={toolActions}
          />
        ) : (
          <View
            className={dockLayoutClasses.classificationPlaceholder}
            style={{ minHeight: dockToolbarMinHeight(3) }}
          >
            <Text className="text-xs text-muted-foreground">Classification</Text>
          </View>
        )}
      </DockSection>
      <AnnotatorSaveSection />
    </DockStrip>
  );
}

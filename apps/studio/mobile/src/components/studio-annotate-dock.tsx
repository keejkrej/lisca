import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
  Button,
  DockSection,
  DockStrip,
  ReadonlyPathField,
  dockLayoutClasses,
  dockSectionWidths,
  Text,
} from "@lisca/ui-native";
import { ActivityIndicator, View } from "react-native";

import { useStudioAnnotateDock } from "../state/studio-annotate-page-selectors";
import { annotationOutputPaths } from "../utils/annotation-output";

export function StudioAnnotateDock() {
  const dock = useStudioAnnotateDock();
  const paths = annotationOutputPaths(dock.request, dock.mode);
  const canEditTools = dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools);
  const disableShuffle = dock.scanLoading || dock.scan === null || dock.workspaceMissing;
  const disableContinue =
    dock.frameLoading || !dock.request || dock.analysisBusy || dock.workspaceMissing;

  return (
    <DockStrip>
      {dock.mode === "segmentation" ? (
        <DockSection className={dockSectionWidths.tool} contentClassName={dockLayoutClasses.content} title="Tool">
          <AnnotationToolGrid
            canEditTools={canEditTools}
            shortcutsEnabled={dock.shortcutsEnabled}
            toolActions={toolActions}
          />
        </DockSection>
      ) : null}
      <DockSection className={dockSectionWidths.save} contentClassName={dockLayoutClasses.content} title="Save">
        <View className={dockLayoutClasses.stack}>
          {paths.length > 1 ? (
            <View className={dockLayoutClasses.cols2}>
              {paths.map((path) => (
                <View key={path} className={dockLayoutClasses.cell}>
                  <ReadonlyPathField value={path} />
                </View>
              ))}
            </View>
          ) : (
            paths.map((path) => <ReadonlyPathField key={path} value={path} />)
          )}
          <Button
            className={dockLayoutClasses.button}
            disabled={!dock.canSave}
            size="sm"
            variant="outline"
            onPress={() => void dock.handleSave()}
          >
            {dock.saving ? <ActivityIndicator size="small" /> : <Text>Save</Text>}
          </Button>
        </View>
      </DockSection>
      <DockSection
        className={dockLayoutClasses.section}
        contentClassName={dockLayoutClasses.content}
        title="Action"
      >
        <View className={dockLayoutClasses.stack}>
          <Button
            className={dockLayoutClasses.button}
            disabled={disableShuffle}
            size="sm"
            variant="outline"
            onPress={dock.shuffleSelection}
          >
            <Text>Shuffle</Text>
          </Button>
          <Button
            className={dockLayoutClasses.button}
            disabled={disableContinue}
            size="sm"
            variant="outline"
            onPress={dock.requestContinueToAnalysis}
          >
            <Text>Continue to analysis</Text>
          </Button>
        </View>
      </DockSection>
    </DockStrip>
  );
}

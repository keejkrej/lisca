import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
  Button,
  DockSection,
  DockStrip,
  ReadonlyPathField,
  dockLayoutClasses,
  dockToolbarMinHeight,
  Text,
} from "@lisca/ui-native";
import { View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { annotationOutputPaths } from "../utils/annotation-output";

export function StudioAnnotateDock({ state }: { state: StudioAnnotateState }) {
  const paths = annotationOutputPaths(state.request, state.mode);
  const shortcutsEnabled =
    state.mode === "segmentation" && state.canEditSegmentation && !state.labelDialogOpen;
  const canEditTools = state.mode === "segmentation" && shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);
  const analysisBusy = Boolean(
    state.analysisProgress &&
      (state.analysisProgress.status === "queued" || state.analysisProgress.status === "running"),
  );
  const disableShuffle = state.scanLoading || state.scan === null || state.workspaceMissing;
  const disableContinue =
    state.frameLoading || !state.request || analysisBusy || state.workspaceMissing;

  return (
    <DockStrip className="flex-wrap">
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Tool"
      >
        {state.mode === "segmentation" ? (
          <AnnotationToolGrid
            canEditTools={canEditTools}
            shortcutsEnabled={shortcutsEnabled}
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
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Save"
      >
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
            disabled={!state.canSave}
            label={state.saving ? "Saving…" : "Save"}
            loading={state.saving}
            size="sm"
            className={dockLayoutClasses.button}
            variant="outline"
            onPress={() => void state.handleSave()}
          />
        </View>
      </DockSection>
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Action"
      >
        <View className={dockLayoutClasses.stack}>
          <Button
            disabled={disableShuffle}
            label="Shuffle"
            size="sm"
            className={dockLayoutClasses.button}
            variant="outline"
            onPress={state.shuffleSelection}
          />
          <Button
            disabled={disableContinue}
            label="Continue to analysis"
            size="sm"
            className={dockLayoutClasses.button}
            variant="outline"
            onPress={state.requestContinueToAnalysis}
          />
        </View>
      </DockSection>
    </DockStrip>
  );
}

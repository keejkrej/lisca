import {
  ANNOTATION_TOOL_DEFINITIONS,
  Button,
  DockSection,
  DockStrip,
  ReadonlyPathField,
  dockLayoutClasses,
  dockToolbarMinHeight,
  dockToolLabel,
  dockToolShortcuts,
  Text,
  useKeyboardShortcuts,
  type DockToolAction,
} from "@lisca/ui-native";
import { View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { annotationOutputPaths } from "../utils/annotation-output";

function buildAnnotationToolActions(
  state: StudioAnnotateState,
  disabled: boolean,
): DockToolAction[] {
  return ANNOTATION_TOOL_DEFINITIONS.map(({ id, label }) => ({
    id,
    label,
    disabled: disabled || id === "smart" || id === "smart-erase",
    active: state.tool === id,
    onSelect: () => state.setTool(id),
  }));
}

function AnnotatorToolToolbar(props: {
  canEditTools: boolean;
  toolActions: DockToolAction[];
}) {
  useKeyboardShortcuts(dockToolShortcuts(props.toolActions), { enabled: props.canEditTools });

  const buttons = props.toolActions.map((action, index) => (
    <View key={action.id} className={dockLayoutClasses.gridCell}>
      <Button
        disabled={action.disabled}
        label={dockToolLabel(action.label, index)}
        size="sm"
        className={dockLayoutClasses.button}
        variant={action.active ? "default" : "outline"}
        onPress={action.onSelect}
      />
    </View>
  ));

  return (
    <View className={dockLayoutClasses.toolbar}>
      <View className={dockLayoutClasses.cols2}>
        {buttons[0]}
        {buttons[1]}
      </View>
      <View className={dockLayoutClasses.cols2}>
        {buttons[2]}
        {buttons[3]}
      </View>
      <View className={dockLayoutClasses.cols2}>
        {buttons[4]}
        {buttons[5]}
      </View>
    </View>
  );
}

export function StudioAnnotateDock({ state }: { state: StudioAnnotateState }) {
  const paths = annotationOutputPaths(state.request, state.mode);
  const shortcutsEnabled =
    state.mode === "segmentation" && state.canEditSegmentation && !state.labelDialogOpen;
  const canEditTools = state.mode === "segmentation" && shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(state, !canEditTools);
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
          <AnnotatorToolToolbar canEditTools={canEditTools} toolActions={toolActions} />
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
            label={state.saving ? "Saving" : "Save"}
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
            label="Continue"
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


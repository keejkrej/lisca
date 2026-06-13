import {
  ANNOTATION_TOOL_DEFINITIONS,
  Button,
  DockSection,
  DockStrip,
  ReadonlyPathField,
  dockLayoutStyles,
  dockToolLabel,
  dockToolShortcuts,
  useKeyboardShortcuts,
  type DockToolAction,
  useShellTheme,
} from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

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
    <View key={action.id} style={dockLayoutStyles.gridCell}>
      <Button
        disabled={action.disabled}
        label={dockToolLabel(action.label, index)}
        size="sm"
        style={dockLayoutStyles.button}
        variant={action.active ? "default" : "outline"}
        onPress={action.onSelect}
      />
    </View>
  ));

  return (
    <View style={dockLayoutStyles.toolbar}>
      <View style={dockLayoutStyles.cols2}>
        {buttons[0]}
        {buttons[1]}
      </View>
      <View style={dockLayoutStyles.cols2}>
        {buttons[2]}
        {buttons[3]}
      </View>
      <View style={dockLayoutStyles.cols2}>
        {buttons[4]}
        {buttons[5]}
      </View>
    </View>
  );
}

export function StudioAnnotateDock({ state }: { state: StudioAnnotateState }) {
  const { colors } = useShellTheme();
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
    <DockStrip style={styles.strip}>
      <DockSection
        contentStyle={dockLayoutStyles.content}
        style={dockLayoutStyles.section}
        title="Tool"
      >
        {state.mode === "segmentation" ? (
          <AnnotatorToolToolbar canEditTools={canEditTools} toolActions={toolActions} />
        ) : (
          <View style={dockLayoutStyles.classificationPlaceholder}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Classification</Text>
          </View>
        )}
      </DockSection>
      <DockSection
        contentStyle={dockLayoutStyles.content}
        style={dockLayoutStyles.section}
        title="Save"
      >
        <View style={dockLayoutStyles.stack}>
          {paths.length > 1 ? (
            <View style={dockLayoutStyles.cols2}>
              {paths.map((path) => (
                <View key={path} style={dockLayoutStyles.cell}>
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
            style={dockLayoutStyles.button}
            variant="outline"
            onPress={() => void state.handleSave()}
          />
        </View>
      </DockSection>
      <DockSection
        contentStyle={dockLayoutStyles.content}
        fit="panel"
        style={dockLayoutStyles.section}
        title="Workflow"
      >
        <Text style={[styles.instructionText, { color: colors.foreground }]}>
          Annotate ROIs before running analysis.
        </Text>
      </DockSection>
      <DockSection
        contentStyle={dockLayoutStyles.content}
        style={dockLayoutStyles.section}
        title="Action"
      >
        <View style={dockLayoutStyles.stack}>
          <Button
            disabled={disableShuffle}
            label="Shuffle"
            size="sm"
            style={dockLayoutStyles.button}
            variant="outline"
            onPress={state.shuffleSelection}
          />
          <Button
            disabled={disableContinue}
            label="Continue"
            size="sm"
            style={dockLayoutStyles.button}
            variant="outline"
            onPress={state.requestContinueToAnalysis}
          />
        </View>
      </DockSection>
    </DockStrip>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexWrap: "wrap",
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});

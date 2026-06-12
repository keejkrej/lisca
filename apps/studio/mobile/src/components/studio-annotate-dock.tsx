import {
  ANNOTATION_TOOL_DEFINITIONS,
  Button,
  DockSection,
  ReadonlyPathField,
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
    <View key={action.id} style={styles.gridCell}>
      <Button
        disabled={action.disabled}
        label={dockToolLabel(action.label, index)}
        size="sm"
        style={styles.button}
        variant={action.active ? "default" : "outline"}
        onPress={action.onSelect}
      />
    </View>
  ));

  return (
    <View style={styles.toolbar}>
      <View style={styles.row}>
        {buttons[0]}
        {buttons[1]}
      </View>
      <View style={styles.row}>
        {buttons[2]}
        {buttons[3]}
      </View>
      <View style={styles.row}>
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
    <View style={styles.root}>
      <DockSection style={styles.section} title="Tool">
        {state.mode === "segmentation" ? (
          <AnnotatorToolToolbar canEditTools={canEditTools} toolActions={toolActions} />
        ) : (
          <View style={styles.classificationPlaceholder}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Classification</Text>
          </View>
        )}
      </DockSection>
      <DockSection style={styles.section} title="Save">
        <View style={styles.saveContent}>
          <View style={[styles.paths, paths.length > 1 ? styles.pathsMulti : null]}>
            {paths.map((path) => (
              <View key={path} style={styles.pathCell}>
                <ReadonlyPathField value={path} />
              </View>
            ))}
          </View>
          <Button
            disabled={!state.canSave}
            label={state.saving ? "Saving" : "Save"}
            loading={state.saving}
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={() => void state.handleSave()}
          />
        </View>
      </DockSection>
      <DockSection fit="panel" style={styles.section} title="Workflow">
        <Text style={[styles.instructionText, { color: colors.foreground }]}>
          Annotate ROIs before running analysis.
        </Text>
      </DockSection>
      <DockSection style={styles.section} title="Action">
        <View style={styles.actions}>
          <Button
            disabled={disableShuffle}
            label="Shuffle"
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={state.shuffleSelection}
          />
          <Button
            disabled={disableContinue}
            label="Continue"
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={state.requestContinueToAnalysis}
          />
        </View>
      </DockSection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "stretch",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    minHeight: 0,
    padding: 12,
  },
  section: {
    minWidth: 0,
  },
  toolbar: {
    gap: 8,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
  classificationPlaceholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  saveContent: {
    gap: 8,
    width: "100%",
  },
  paths: {
    gap: 8,
  },
  pathsMulti: {
    flexDirection: "row",
  },
  pathCell: {
    flex: 1,
    minWidth: 0,
  },
  button: {
    width: "100%",
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  actions: {
    gap: 8,
    width: "100%",
  },
});

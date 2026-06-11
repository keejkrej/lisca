import type { RoiFrameRequest } from "@lisca/contracts";
import type { AnnotationMode } from "@lisca/ui-native/features";
import {
  ANNOTATION_TOOL_DEFINITIONS,
  Button,
  DockSection,
  ReadonlyPathField,
  dockToolLabel,
  dockToolShortcuts,
  useKeyboardShortcuts,
  type AnnotationTool,
  type DockToolAction,
  useShellTheme,
} from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import { annotationOutputPaths } from "../utils/annotation-output";

function buildAnnotationToolActions(
  tool: AnnotationTool,
  onToolChange: (tool: AnnotationTool) => void,
  disabled: boolean,
): DockToolAction[] {
  return ANNOTATION_TOOL_DEFINITIONS.map(({ id, label }) => ({
    id,
    label,
    disabled: disabled || id === "smart" || id === "smart-erase",
    active: tool === id,
    onSelect: () => onToolChange(id),
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

export function AnnotatorDock(props: {
  mode: AnnotationMode;
  tool: AnnotationTool;
  request: RoiFrameRequest | null;
  canSave: boolean;
  saving: boolean;
  shortcutsEnabled?: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onSave: () => void;
}) {
  const { colors } = useShellTheme();
  const paths = annotationOutputPaths(props.request, props.mode);
  const canEditTools = props.mode === "segmentation" && props.shortcutsEnabled !== false;
  const toolActions = buildAnnotationToolActions(props.tool, props.onToolChange, !canEditTools);

  return (
    <View style={styles.root}>
      <DockSection style={styles.section} title="Tool">
        {props.mode === "segmentation" ? (
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
            disabled={!props.canSave}
            label={props.saving ? "Saving" : "Save"}
            loading={props.saving}
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={props.onSave}
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
});

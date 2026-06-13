import type { RoiFrameRequest } from "@lisca/contracts";
import type { AnnotationMode } from "@lisca/ui-native/features";
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
    <DockStrip>
      <DockSection
        contentStyle={dockLayoutStyles.content}
        style={dockLayoutStyles.section}
        title="Tool"
      >
        {props.mode === "segmentation" ? (
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
            disabled={!props.canSave}
            label={props.saving ? "Saving" : "Save"}
            loading={props.saving}
            size="sm"
            style={dockLayoutStyles.button}
            variant="outline"
            onPress={props.onSave}
          />
        </View>
      </DockSection>
    </DockStrip>
  );
}

import type { RoiFrameRequest } from "@lisca/contracts";
import type { AnnotationMode } from "@lisca/ui-native/features";
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
  type AnnotationTool,
  type DockToolAction,
} from "@lisca/ui-native";
import { View } from "react-native";

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
  const paths = annotationOutputPaths(props.request, props.mode);
  const canEditTools = props.mode === "segmentation" && props.shortcutsEnabled !== false;
  const toolActions = buildAnnotationToolActions(props.tool, props.onToolChange, !canEditTools);

  return (
    <DockStrip>
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Tool"
      >
        {props.mode === "segmentation" ? (
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
            disabled={!props.canSave}
            label={props.saving ? "Saving" : "Save"}
            loading={props.saving}
            size="sm"
            className={dockLayoutClasses.button}
            variant="outline"
            onPress={props.onSave}
          />
        </View>
      </DockSection>
    </DockStrip>
  );
}

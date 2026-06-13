import { View } from "react-native";

import { Button, dockLayoutClasses, useKeyboardShortcuts } from "../../shell";
import { dockToolLabel, dockToolShortcuts, type DockToolAction } from "@lisca/ui-headless/dock";
import {
  ANNOTATION_TOOL_DEFINITIONS,
  type AnnotationTool,
} from "@lisca/ui-headless/annotation-tools";

export function buildAnnotationToolActions(
  tool: AnnotationTool,
  onToolChange: (tool: AnnotationTool) => void,
  disabled: boolean,
  options?: { disableTool?: (tool: AnnotationTool) => boolean },
): DockToolAction[] {
  return ANNOTATION_TOOL_DEFINITIONS.map(({ id, label }) => ({
    id,
    label,
    disabled: disabled || (options?.disableTool?.(id) ?? false),
    active: tool === id,
    onSelect: () => onToolChange(id),
  }));
}

export function AnnotationToolGrid(props: {
  canEditTools: boolean;
  toolActions: DockToolAction[];
  shortcutsEnabled?: boolean;
}) {
  useKeyboardShortcuts(dockToolShortcuts(props.toolActions), {
    enabled: props.canEditTools && (props.shortcutsEnabled ?? true),
  });

  const showShortcutLabels = props.shortcutsEnabled ?? true;

  const buttons = props.toolActions.map((action, index) => {
    const label = showShortcutLabels ? dockToolLabel(action.label, index) : action.label;
    return (
      <View key={action.id} className={dockLayoutClasses.gridCell}>
        <Button
          className={dockLayoutClasses.button}
          disabled={action.disabled}
          label={label}
          size="sm"
          variant={action.active ? "default" : "outline"}
          onPress={action.onSelect}
        />
      </View>
    );
  });

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

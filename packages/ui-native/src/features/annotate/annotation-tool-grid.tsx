import {
  ANNOTATION_TOOL_DEFINITIONS,
  ANNOTATION_TOOL_GRID_ROWS,
  annotationToolFamily,
  type AnnotationTool,
  type AnnotationToolFamily,
} from "@lisca/ui-headless/annotation-tools";
import { dockToolLabel, dockToolShortcuts, type DockToolAction } from "@lisca/ui-headless/dock";
import { Lasso, Paintbrush, Sparkles, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Icon } from "../../../components/ui/icon";
import { Text } from "../../../components/ui/text";
import { keyboardShortcutsSupported, useKeyboardShortcuts } from "../../shell";

const annotationToolIcons: Record<AnnotationToolFamily, LucideIcon> = {
  brush: Paintbrush,
  lasso: Lasso,
  smart: Sparkles,
};

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

function AnnotationToolButton(props: {
  action: DockToolAction;
  label: string;
}) {
  const family = annotationToolFamily(props.action.id as AnnotationTool);
  const ToolIcon = annotationToolIcons[family];

  return (
    <View className="min-w-0 flex-1">
      <Button
        className="w-full min-w-0 justify-center gap-1.5 px-1.5"
        disabled={props.action.disabled}
        size="sm"
        variant={props.action.active ? "default" : "outline"}
        onPress={props.action.onSelect}
      >
        <Icon as={ToolIcon} className="size-4 shrink-0" />
        <Text className="min-w-0 flex-1 truncate text-xs">{props.label}</Text>
      </Button>
    </View>
  );
}

export function AnnotationToolGrid(props: {
  canEditTools: boolean;
  toolActions: DockToolAction[];
  className?: string;
  shortcutsEnabled?: boolean;
}) {
  const shortcutsActive = props.canEditTools && (props.shortcutsEnabled ?? true);
  const showShortcutLabels = keyboardShortcutsSupported && shortcutsActive;
  useKeyboardShortcuts(dockToolShortcuts(props.toolActions), {
    enabled: showShortcutLabels,
  });

  const buttons = props.toolActions.map((action, index) => {
    const label = showShortcutLabels ? dockToolLabel(action.label, index) : action.label;
    return <AnnotationToolButton key={action.id} action={action} label={label} />;
  });

  return (
    <View
      accessibilityLabel="Annotation tool"
      accessibilityRole="toolbar"
      className={props.className ?? "flex w-full flex-col gap-2"}
    >
      {ANNOTATION_TOOL_GRID_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} className="w-full flex-row gap-2">
          {row.map((buttonIndex) => buttons[buttonIndex])}
        </View>
      ))}
    </View>
  );
}

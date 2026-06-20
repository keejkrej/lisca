import {
  Button,
  DockSection,
  DockStrip,
  Text,
  dockLayoutClasses,
  dockToolLabel,
  dockToolShortcuts,
  keyboardShortcutsSupported,
  useKeyboardShortcuts,
  type DockToolAction,
} from "@lisca/ui-native";
import { View } from "react-native";

export function StudioResultDock(props: {
  instruction: string;
  toolActions: DockToolAction[];
  shortcutsEnabled: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  onSave: () => void;
}) {
  const showShortcutLabels = keyboardShortcutsSupported && props.shortcutsEnabled;
  useKeyboardShortcuts(dockToolShortcuts(props.toolActions), {
    enabled: showShortcutLabels,
  });

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <Text className="text-center text-sm leading-snug text-foreground" numberOfLines={4}>
          {props.instruction}
        </Text>
      </DockSection>
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Tool"
      >
        <View className={dockLayoutClasses.stack}>
          {props.toolActions.map((action, index) => (
            <Button
              key={action.id}
              className={dockLayoutClasses.button}
              disabled={action.disabled}
              size="sm"
              variant={action.active ? "default" : "outline"}
              onPress={action.onSelect}
            >
              <Text>{showShortcutLabels ? dockToolLabel(action.label, index) : action.label}</Text>
            </Button>
          ))}
        </View>
      </DockSection>
      <DockSection
        contentClassName={dockLayoutClasses.content}
        className={dockLayoutClasses.section}
        title="Action"
      >
        <View className={dockLayoutClasses.stack}>
          <Button
            className={dockLayoutClasses.button}
            disabled={props.saveDisabled}
            size="sm"
            variant="outline"
            onPress={props.onSave}
          >
            <Text>{props.saveLabel}</Text>
          </Button>
        </View>
      </DockSection>
    </DockStrip>
  );
}

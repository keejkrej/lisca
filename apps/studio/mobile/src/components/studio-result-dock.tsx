import {
  Button,
  DockSection,
  DockStrip,
  Text,
  dockLayoutClasses,
  dockToolLabel,
  dockToolShortcuts,
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
  useKeyboardShortcuts(dockToolShortcuts(props.toolActions), {
    enabled: props.shortcutsEnabled,
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
              <Text>{dockToolLabel(action.label, index)}</Text>
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


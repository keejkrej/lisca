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
        <Text className="text-center text-sm leading-5 text-foreground">
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
              disabled={action.disabled}
              label={dockToolLabel(action.label, index)}
              size="sm"
              className={dockLayoutClasses.button}
              variant={action.active ? "default" : "outline"}
              onPress={action.onSelect}
            />
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
            disabled={props.saveDisabled}
            label={props.saveLabel}
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


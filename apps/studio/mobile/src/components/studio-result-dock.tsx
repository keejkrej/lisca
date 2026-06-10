import {
  Button,
  DockSection,
  DockStrip,
  dockToolLabel,
  dockToolShortcuts,
  useKeyboardShortcuts,
  useShellTheme,
  type DockToolAction,
} from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

export function StudioResultDock(props: {
  instruction: string;
  toolActions: DockToolAction[];
  shortcutsEnabled: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  onSave: () => void;
}) {
  const { colors } = useShellTheme();
  useKeyboardShortcuts(dockToolShortcuts(props.toolActions), {
    enabled: props.shortcutsEnabled,
  });

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <Text style={[styles.instructionText, { color: colors.foreground }]}>
          {props.instruction}
        </Text>
      </DockSection>
      <DockSection style={styles.section} title="Tool">
        <View style={styles.actions}>
          {props.toolActions.map((action, index) => (
            <Button
              key={action.id}
              disabled={action.disabled}
              label={dockToolLabel(action.label, index)}
              size="sm"
              style={styles.button}
              variant={action.active ? "default" : "outline"}
              onPress={action.onSelect}
            />
          ))}
        </View>
      </DockSection>
      <DockSection style={styles.section} title="Action">
        <View style={styles.actions}>
          <Button
            disabled={props.saveDisabled}
            label={props.saveLabel}
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={props.onSave}
          />
        </View>
      </DockSection>
    </DockStrip>
  );
}

const styles = StyleSheet.create({
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  section: {
    minWidth: 0,
  },
  actions: {
    gap: 8,
  },
  button: {
    width: "100%",
  },
});

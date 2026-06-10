import {
  Button,
  DockSection,
  dockToolLabel,
  useDockToolShortcuts,
  useShellTheme,
  type DockToolAction,
} from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import { StudioDockStrip } from "./studio-dock-strip";

export function StudioResultDock(props: {
  instruction: string;
  toolActions: DockToolAction[];
  shortcutsEnabled: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  onSave: () => void;
}) {
  const { colors } = useShellTheme();
  useDockToolShortcuts(props.toolActions, { enabled: props.shortcutsEnabled });

  return (
    <StudioDockStrip panels={3}>
      <DockSection style={styles.section} title="Instruction">
        <Text style={[styles.text, { color: colors.foreground }]}>{props.instruction}</Text>
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
    </StudioDockStrip>
  );
}

const styles = StyleSheet.create({
  section: {
    flex: 1,
    minWidth: 0,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  actions: {
    gap: 8,
    width: "100%",
  },
  button: {
    width: "100%",
  },
});

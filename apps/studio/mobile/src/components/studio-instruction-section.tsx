import { DockSection, useShellTheme } from "@lisca/ui-native";
import { StyleSheet, Text } from "react-native";

export function StudioInstructionSection({ children }: { children: string }) {
  const { colors } = useShellTheme();

  return (
    <DockSection style={styles.section} title="Instruction">
      <Text style={[styles.text, { color: colors.foreground }]}>{children}</Text>
    </DockSection>
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
});

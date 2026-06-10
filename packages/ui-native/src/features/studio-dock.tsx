import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Section } from "../shell/section.tsx";
import { useShellTheme } from "../theme/shell-theme.tsx";

export function StudioDock(props: { instruction?: string; tool?: ReactNode; action?: ReactNode }) {
  const { colors } = useShellTheme();

  return (
    <View style={styles.root}>
      <Section
        contentStyle={styles.instructionContent}
        style={styles.instructionSection}
        title="Instruction"
      >
        {props.instruction ? (
          <Text style={[styles.instructionText, { color: colors.foreground }]}>
            {props.instruction}
          </Text>
        ) : null}
      </Section>
      {props.tool ? (
        <Section contentStyle={styles.centerContent} style={styles.toolSection} title="Tool">
          {props.tool}
        </Section>
      ) : null}
      <Section contentStyle={styles.centerContent} style={styles.actionSection} title="Action">
        {props.action}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 0,
    padding: 12,
    width: "100%",
  },
  instructionSection: {
    flex: 2,
    minWidth: 0,
  },
  toolSection: {
    flex: 3,
    minWidth: 0,
  },
  actionSection: {
    flex: 2,
    minWidth: 0,
  },
  instructionContent: {
    flex: 1,
    justifyContent: "center",
    minHeight: 0,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    minHeight: 0,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});

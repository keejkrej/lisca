import { Button, DockSection, DockStrip, dockLayoutStyles, useShellTheme } from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import { instructionForStep } from "../state/studio-routes";
import type { StudioStep } from "../state/studio-store";

export function StudioInfoDock(props: {
  step: StudioStep;
  infoStep: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const { colors } = useShellTheme();

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <Text style={[styles.instructionText, { color: colors.foreground }]}>
          {instructionForStep(props.step)}
        </Text>
      </DockSection>
      <DockSection
        contentStyle={dockLayoutStyles.content}
        style={dockLayoutStyles.section}
        title="Action"
      >
        <View style={dockLayoutStyles.stack}>
          <Button
            disabled={props.infoStep === 1}
            label="Back"
            size="sm"
            style={dockLayoutStyles.button}
            variant="outline"
            onPress={props.onBack}
          />
          <Button
            label="Next"
            size="sm"
            style={dockLayoutStyles.button}
            variant="outline"
            onPress={props.onNext}
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
});

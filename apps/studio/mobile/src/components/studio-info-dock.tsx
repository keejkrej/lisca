import { Button, DockSection } from "@lisca/ui-native";
import { StyleSheet, View } from "react-native";

import { instructionForStep } from "../state/studio-routes";
import type { StudioStep } from "../state/studio-store";
import { StudioDockStrip } from "./studio-dock-strip";
import { StudioInstructionSection } from "./studio-instruction-section";

export function StudioInfoDock(props: {
  step: StudioStep;
  infoStep: number;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <StudioDockStrip panels={2}>
      <StudioInstructionSection>{instructionForStep(props.step)}</StudioInstructionSection>
      <DockSection style={styles.section} title="Action">
        <View style={styles.actions}>
          <Button
            disabled={props.infoStep === 1}
            label="Back"
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={props.onBack}
          />
          <Button
            label="Next"
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={props.onNext}
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
  actions: {
    gap: 8,
    width: "100%",
  },
  button: {
    width: "100%",
  },
});

import { Button, DockSection } from "@lisca/ui-native";
import { StyleSheet, View } from "react-native";

import type { StudioAlignState } from "../state/use-studio-align-state";
import { instructionForStep } from "../state/studio-routes";
import { StudioAlignTools } from "./studio-align-tools";
import { StudioDockStrip } from "./studio-dock-strip";
import { StudioInstructionSection } from "./studio-instruction-section";

export function StudioAlignDock({ state }: { state: StudioAlignState }) {
  return (
    <StudioDockStrip panels={3}>
      <StudioInstructionSection>{instructionForStep("alignPattern")}</StudioInstructionSection>
      <DockSection style={styles.section} title="Tool">
        <StudioAlignTools state={state} />
      </DockSection>
      <DockSection style={styles.section} title="Action">
        <View style={styles.actions}>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Button
                disabled={!state.frame || state.saving || state.cropping}
                label="Reset"
                size="sm"
                style={styles.button}
                variant="outline"
                onPress={state.resetCurrent}
              />
            </View>
            <View style={styles.cell}>
              <Button
                disabled={
                  !state.workspacePath ||
                  state.alignPositions.length === 0 ||
                  state.saving ||
                  state.cropping ||
                  state.findingFirstUnaligned
                }
                label="Jump"
                size="sm"
                style={styles.button}
                variant="outline"
                onPress={() => void state.goToFirstUnaligned()}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Button
                disabled={!state.canGoBack || state.saving || state.cropping}
                label="Back"
                size="sm"
                style={styles.button}
                variant="outline"
                onPress={state.goBack}
              />
            </View>
            <View style={styles.cell}>
              <Button
                disabled={!state.frame || state.saving || state.cropping}
                label="Next"
                size="sm"
                style={styles.button}
                variant="outline"
                onPress={() => void state.saveAndAdvance()}
              />
            </View>
          </View>
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
  row: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  button: {
    width: "100%",
  },
});

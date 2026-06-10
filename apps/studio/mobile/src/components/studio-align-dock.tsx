import {
  AlignGridShapeDockSection,
  AlignToolToolbar,
  Button,
  DockSection,
  DockStrip,
  useShellTheme,
} from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import type { StudioAlignState } from "../state/use-studio-align-state";
import { instructionForStep } from "../state/studio-routes";

export function StudioAlignDock({ state }: { state: StudioAlignState }) {
  const { colors } = useShellTheme();
  const gridDisabled = state.cropping || !state.frame;

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <Text style={[styles.instructionText, { color: colors.foreground }]}>
          {instructionForStep("alignPattern")}
        </Text>
      </DockSection>
      <AlignGridShapeDockSection
        disabled={gridDisabled}
        shape={state.grid.shape}
        onShapeChange={(shape) =>
          state.setGrid((grid) => ({
            ...grid,
            shape,
          }))
        }
      />
      <DockSection style={styles.section} title="Tool">
        <AlignToolToolbar
          mode={state.toolMode}
          patternZoomLocked={state.patternZoomLocked}
          onModeChange={state.setToolMode}
          onPatternZoomLockedChange={state.setPatternZoomLocked}
        />
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

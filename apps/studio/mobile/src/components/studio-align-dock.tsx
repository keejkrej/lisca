import {
  AlignGridShapeDockSection,
  AlignToolToolbar,
  Button,
  DockSection,
  DockStrip,
  dockLayoutStyles,
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
      <DockSection
        contentStyle={dockLayoutStyles.content}
        style={dockLayoutStyles.section}
        title="Tool"
      >
        <AlignToolToolbar
          mode={state.toolMode}
          patternZoomLocked={state.patternZoomLocked}
          onModeChange={state.setToolMode}
          onPatternZoomLockedChange={state.setPatternZoomLocked}
        />
      </DockSection>
      <DockSection
        contentStyle={dockLayoutStyles.content}
        style={dockLayoutStyles.section}
        title="Action"
      >
        <View style={dockLayoutStyles.stack}>
          <View style={dockLayoutStyles.cols2}>
            <View style={dockLayoutStyles.cell}>
              <Button
                disabled={!state.frame || state.saving || state.cropping}
                label="Reset"
                size="sm"
                variant="outline"
                onPress={state.resetCurrent}
              />
            </View>
            <View style={dockLayoutStyles.cell}>
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
                variant="outline"
                onPress={() => void state.goToFirstUnaligned()}
              />
            </View>
          </View>
          <View style={dockLayoutStyles.cols2}>
            <View style={dockLayoutStyles.cell}>
              <Button
                disabled={!state.canGoBack || state.saving || state.cropping}
                label="Back"
                size="sm"
                variant="outline"
                onPress={state.goBack}
              />
            </View>
            <View style={dockLayoutStyles.cell}>
              <Button
                disabled={!state.frame || state.saving || state.cropping}
                label="Next"
                size="sm"
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
});

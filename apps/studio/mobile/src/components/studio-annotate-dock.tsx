import { Button, DockSection, DockStrip, useShellTheme } from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";

export function StudioAnnotateDock({ state }: { state: StudioAnnotateState }) {
  const analysisBusy = Boolean(
    state.analysisProgress &&
      (state.analysisProgress.status === "queued" || state.analysisProgress.status === "running"),
  );
  const disableShuffle = state.scanLoading || state.scan === null || Boolean(state.error);
  const disableNext = state.frameLoading || !state.request || analysisBusy;
  const { colors } = useShellTheme();

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <Text style={[styles.instructionText, { color: colors.foreground }]}>
          Review cropped ROI frames.
        </Text>
      </DockSection>
      <DockSection style={styles.section} title="Action">
        <View style={styles.actions}>
          <Button
            disabled={disableShuffle}
            label="Shuffle"
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={state.shuffleSelection}
          />
          <Button
            disabled={disableNext}
            label="Next"
            size="sm"
            style={styles.button}
            variant="outline"
            onPress={() => state.setAnalysisStartConfirm(true)}
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

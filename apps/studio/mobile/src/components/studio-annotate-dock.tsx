import { Button, DockSection, useShellTheme } from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { StudioDockStrip } from "./studio-dock-strip";

export function StudioAnnotateDock({ state }: { state: StudioAnnotateState }) {
  const { colors } = useShellTheme();
  const analysisBusy = Boolean(
    state.analysisProgress &&
      (state.analysisProgress.status === "queued" || state.analysisProgress.status === "running"),
  );
  const disableShuffle = state.scanLoading || state.scan === null || Boolean(state.error);
  const disableNext = state.frameLoading || !state.request || analysisBusy;

  return (
    <StudioDockStrip panels={2}>
      <DockSection style={styles.section} title="Instruction">
        <Text style={[styles.text, { color: colors.foreground }]}>Review cropped ROI frames.</Text>
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

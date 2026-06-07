import { AppShell, DockButton, StudioDock } from "@lisca/ui-native";
import { StyleSheet, View } from "react-native";

import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioAnnotateMain } from "../src/components/studio-annotate-main";
import { StudioLeft } from "../src/components/studio-left";
import { useStudioAnnotateState } from "../src/state/use-studio-annotate-state";

export default function AnnotateRoute() {
  const state = useStudioAnnotateState();
  const analysisBusy = Boolean(
    state.analysisProgress &&
      (state.analysisProgress.status === "queued" || state.analysisProgress.status === "running"),
  );
  const disableShuffle = state.scanLoading || state.scan === null || Boolean(state.error);
  const disableNext = state.frameLoading || !state.request || analysisBusy;

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAnnotateMain state={state} />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction="Review cropped ROI frames."
              action={
                <View style={styles.gridRow}>
                  <View style={styles.gridCell}>
                    <DockButton
                      disabled={disableShuffle}
                      label="Shuffle"
                      onPress={state.shuffleSelection}
                    />
                  </View>
                  <View style={styles.gridCell}>
                    <DockButton
                      disabled={disableNext}
                      label="Next"
                      onPress={() => state.setAnalysisStartConfirm(true)}
                    />
                  </View>
                </View>
              }
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={STUDIO_NAV_WIDTH} />
      </AppShell.Body>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  gridRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
});

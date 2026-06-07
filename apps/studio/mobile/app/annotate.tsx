import { AppShell, AnnotationCanvas, Button, Section, ViewportCard } from "@lisca/ui-native";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { StudioAnalysisProgressModal, StudioAnalysisStartModal } from "../src/components/studio-analysis-modals";
import { StudioNavRail } from "../src/components/studio-nav-rail";
import { useStudioAnnotateState } from "../src/state/use-studio-annotate-state";

export default function AnnotateRoute() {
  const state = useStudioAnnotateState();
  const emptyMask = useMemo(
    () => (state.frame ? new Uint8Array(state.frame.width * state.frame.height) : new Uint8Array()),
    [state.frame],
  );
  const analysisBusy = Boolean(
    state.analysisProgress &&
      (state.analysisProgress.status === "queued" || state.analysisProgress.status === "running"),
  );
  const disableShuffle = state.scanLoading || state.scan === null || Boolean(state.error);
  const disableNext = state.frameLoading || !state.request || analysisBusy;

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={96}>
          <StudioNavRail />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <ViewportCard>
              <AnnotationCanvas
                activeLabelId={null}
                brushSize={1}
                disabled
                frame={state.frame}
                labels={[]}
                mask={emptyMask}
                overlayOpacity={0}
                toasts={state.toasts}
                tool="brush"
                onMaskCommit={() => undefined}
              />
            </ViewportCard>
          </AppShell.Main>
          <AppShell.Dock>
            <View style={styles.dock}>
              <Section title="Review cropped ROI frames">
                <View style={styles.row}>
                  <Button label="Shuffle" disabled={disableShuffle} onPress={state.shuffleSelection} />
                  <Button
                    label="Next"
                    disabled={disableNext}
                    onPress={() => state.setAnalysisStartConfirm(true)}
                  />
                </View>
              </Section>
            </View>
          </AppShell.Dock>
        </AppShell.MainColumn>
      </AppShell.Body>
      <StudioAnalysisStartModal state={state} />
      <StudioAnalysisProgressModal state={state} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  dock: { padding: 12 },
  row: { flexDirection: "row", gap: 8 },
});

import { AppShell, DockButton, StudioDock } from "@lisca/ui-native";
import { StyleSheet, View } from "react-native";

import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioAlignMain } from "../src/components/studio-align-main";
import { StudioAlignTools } from "../src/components/studio-align-tools";
import { StudioLeft } from "../src/components/studio-left";
import { instructionForStep } from "../src/state/studio-routes";
import { useStudioAlignState } from "../src/state/use-studio-align-state";

export default function AlignRoute() {
  const alignState = useStudioAlignState();

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAlignMain state={alignState} />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction={instructionForStep("alignPattern")}
              action={
                <View style={styles.actions}>
                  <View style={styles.gridRow}>
                    <View style={styles.gridCell}>
                      <DockButton
                        disabled={!alignState.frame || alignState.saving || alignState.cropping}
                        label="Reset"
                        onPress={alignState.resetCurrent}
                      />
                    </View>
                    <View style={styles.gridCell}>
                      <DockButton
                        disabled={
                          !alignState.workspacePath ||
                          alignState.alignPositions.length === 0 ||
                          alignState.saving ||
                          alignState.cropping ||
                          alignState.findingFirstUnaligned
                        }
                        label="Jump"
                        onPress={() => void alignState.goToFirstUnaligned()}
                      />
                    </View>
                  </View>
                  <View style={styles.gridRow}>
                    <View style={styles.gridCell}>
                      <DockButton
                        disabled={!alignState.canGoBack || alignState.saving || alignState.cropping}
                        label="Back"
                        onPress={alignState.goBack}
                      />
                    </View>
                    <View style={styles.gridCell}>
                      <DockButton
                        disabled={!alignState.frame || alignState.saving || alignState.cropping}
                        label="Next"
                        onPress={() => void alignState.saveAndAdvance()}
                      />
                    </View>
                  </View>
                </View>
              }
              tool={<StudioAlignTools state={alignState} />}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={STUDIO_NAV_WIDTH} />
      </AppShell.Body>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 8,
    width: "100%",
  },
  gridRow: {
    flexDirection: "row",
    gap: 8,
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
});

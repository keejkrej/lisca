import { AppShell, DockButton, StudioDock } from "@lisca/ui-native";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { studioHostOperations } from "../src/api/studio-port";
import { BasicInfoStep1 } from "../src/components/basic-info-step1";
import { BasicInfoStep2 } from "../src/components/basic-info-step2";
import { BasicInfoStep3 } from "../src/components/basic-info-step3";
import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioLeft } from "../src/components/studio-left";
import { instructionForStep } from "../src/state/studio-routes";
import { useStudioStore } from "../src/state/studio-store";

export default function InfoRoute() {
  const router = useRouter();
  const infoStep = useStudioStore((state) => state.infoStep);
  const setInfoStep = useStudioStore((state) => state.setInfoStep);
  const step = infoStep === 1 ? "info1" : infoStep === 2 ? "info2" : "info3";

  const next = () => {
    if (infoStep < 3) {
      setInfoStep((infoStep + 1) as 1 | 2 | 3);
      return;
    }
    router.push("/align");
  };

  const back = () => {
    if (infoStep > 1) setInfoStep((infoStep - 1) as 1 | 2 | 3);
  };

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <ScrollView contentContainerStyle={styles.mainContent}>
              {infoStep === 1 ? <BasicInfoStep1 hostPort={studioHostOperations} /> : null}
              {infoStep === 2 ? <BasicInfoStep2 /> : null}
              {infoStep === 3 ? <BasicInfoStep3 /> : null}
            </ScrollView>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction={instructionForStep(step)}
              action={
                <View style={styles.actions}>
                  <DockButton disabled={infoStep === 1} label="Back" onPress={back} />
                  <DockButton label="Next" onPress={next} />
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
  mainContent: {
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 832,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: "100%",
  },
  actions: {
    gap: 8,
    width: "100%",
  },
});

import { AppShell, Button, Panel } from "@lisca/ui-native";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { StudioNavRail } from "../src/components/studio-nav-rail";
import { useStudioStore, type InfoStep } from "../src/state/studio-store";

function stepDelta(step: InfoStep, delta: number): InfoStep {
  return Math.min(3, Math.max(1, step + delta)) as InfoStep;
}

export default function InfoRoute() {
  const router = useRouter();
  const infoStep = useStudioStore((state) => state.infoStep);
  const setInfoStep = useStudioStore((state) => state.setInfoStep);
  const info1 = useStudioStore((state) => state.info1);
  const info2 = useStudioStore((state) => state.info2);

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={96}>
          <StudioNavRail />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <View style={styles.content}>
              <Panel title={`Basic info — step ${infoStep}`}>
                {infoStep === 1 ? (
                  <>
                    <Text>Assay name: {info1.name}</Text>
                    <Text>Date: {info1.date}</Text>
                    <Text>Data path: {info1.dataPath}</Text>
                    <Text>Save to: {info1.saveTo}</Text>
                  </>
                ) : infoStep === 2 ? (
                  <>
                    <Text>Pattern: {info2.pattern}</Text>
                    <Text>
                      Timelapse: {info2.timelapseAmount ?? "—"} {info2.timelapseUnit}
                    </Text>
                    <Text>Features: {info2.selectedFeatures.join(", ") || "None"}</Text>
                  </>
                ) : (
                  <Text>Configure sample rows on web for full editing; continue to align when ready.</Text>
                )}
                <View style={styles.row}>
                  <Button
                    label="Previous"
                    variant="outline"
                    disabled={infoStep <= 1}
                    onPress={() => setInfoStep(stepDelta(infoStep, -1))}
                  />
                  <Button
                    label={infoStep >= 3 ? "Continue to align" : "Next"}
                    onPress={() =>
                      infoStep >= 3 ? router.push("/align") : setInfoStep(stepDelta(infoStep, 1))
                    }
                  />
                </View>
              </Panel>
            </View>
          </AppShell.Main>
        </AppShell.MainColumn>
      </AppShell.Body>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 24 },
  row: { flexDirection: "row", gap: 8, marginTop: 12 },
});

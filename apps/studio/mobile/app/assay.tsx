import { AppShell, Button, HostFilePickerDialog, Panel, Section } from "@lisca/ui-native";
import { runClientEffect } from "@lisca/client/runtime";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { studioClient, studioHostOperations } from "../src/api/studio-port";
import { StudioNavRail } from "../src/components/studio-nav-rail";
import { parseStudioAssayJson, useStudioStore } from "../src/state/studio-store";

export default function AssayRoute() {
  const router = useRouter();
  const assayId = useStudioStore((state) => state.assayId);
  const loadAssayJson = useStudioStore((state) => state.loadAssayJson);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  const openAssay = async (path: string) => {
    setPickerOpen(false);
    setOpening(true);
    try {
      const contents = await runClientEffect(studioClient.readTextFile(path));
      loadAssayJson(parseStudioAssayJson(contents));
      router.push("/info");
    } finally {
      setOpening(false);
    }
  };

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={96}>
          <StudioNavRail />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <View style={styles.center}>
              <Panel title="Choose assay">
                <Text>Selected assay: {assayId}</Text>
                <Button label="Continue to basic info" onPress={() => router.push("/info")} />
                <Button label={opening ? "Opening..." : "Open assay JSON"} variant="outline" onPress={() => setPickerOpen(true)} />
              </Panel>
            </View>
          </AppShell.Main>
        </AppShell.MainColumn>
      </AppShell.Body>
      <HostFilePickerDialog
        hostPort={studioHostOperations}
        mode="assay_json_file"
        open={pickerOpen}
        title="Assay JSON"
        onOpenChange={setPickerOpen}
        onPickFile={(path) => void openAssay(path)}
        onPickDirectory={() => undefined}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", padding: 24 },
});

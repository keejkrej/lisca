import {
  AppShell,
  DockButton,
  DockToolGrid,
  HostFilePickerDialog,
  StudioDock,
} from "@lisca/ui-native";
import { runClientEffect } from "@lisca/client/runtime";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { studioClient, studioHostOperations } from "../src/api/studio-port";
import { ChooseAssay } from "../src/components/choose-assay";
import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioLeft } from "../src/components/studio-left";
import { instructionForStep } from "../src/state/studio-routes";
import { parseStudioAssayJson, useStudioStore } from "../src/state/studio-store";

export default function AssayRoute() {
  const router = useRouter();
  const assayId = useStudioStore((state) => state.assayId);
  const setInfoStep = useStudioStore((state) => state.setInfoStep);
  const loadAssayJson = useStudioStore((state) => state.loadAssayJson);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  const toolActions = useMemo(
    () => [
      {
        id: "open-assay",
        label: "Open assay",
        disabled: opening || pickerOpen,
        onSelect: () => setPickerOpen(true),
      },
    ],
    [opening, pickerOpen],
  );

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
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <ScrollView contentContainerStyle={styles.mainContent}>
              <ChooseAssay />
            </ScrollView>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction={instructionForStep("chooseAssay")}
              action={
                <DockButton
                  disabled={!assayId}
                  label="Next"
                  onPress={() => {
                    setInfoStep(1);
                    router.push("/info");
                  }}
                />
              }
              tool={<DockToolGrid actions={toolActions} columns={1} enabled={!pickerOpen} />}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={STUDIO_NAV_WIDTH} />
      </AppShell.Body>
      <HostFilePickerDialog
        hostPort={studioHostOperations}
        mode="assay_json_file"
        open={pickerOpen}
        title="Open assay.json"
        onOpenChange={setPickerOpen}
        onPickFile={(path) => void openAssay(path)}
        onPickDirectory={() => undefined}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: "100%",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
});

import { AppShell, HostFilePickerDialog } from "@lisca/ui-native";
import { runClientEffect } from "@lisca/client/runtime";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import { studioClient, studioHostOperations } from "../src/api/studio-port";
import { ChooseAssay } from "../src/components/choose-assay";
import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioAssayDock } from "../src/components/studio-assay-dock";
import { StudioLeft } from "../src/components/studio-left";
import { parseStudioAssayJson, useStudioStore } from "../src/state/studio-store";

export default function AssayRoute() {
  const router = useRouter();
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
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <ScrollView contentContainerClassName="min-h-full flex-grow justify-center px-6 py-6">
              <ChooseAssay />
            </ScrollView>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAssayDock
              opening={opening}
              pickerOpen={pickerOpen}
              onOpenAssay={() => setPickerOpen(true)}
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


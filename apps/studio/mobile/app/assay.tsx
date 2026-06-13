import { AppShell, HostFilePickerDialog, Text } from "@lisca/ui-native";
import { runClientEffect } from "@lisca/client/runtime";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { studioClient, studioHostOperations } from "../src/api/studio-port";
import { ChooseAssay } from "../src/components/choose-assay";
import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioAssayDock } from "../src/components/studio-assay-dock";
import { StudioLeft } from "../src/components/studio-left";
import { useStudioProfile } from "../src/components/studio-profile-provider";
import { useStudioMemoryRecent } from "../src/hooks/use-studio-memory-recent";
import { parseStudioAssayJson, useStudioStore } from "../src/state/studio-store";
import { recordStudioAssayMemory } from "../src/utils/studio-memory";

export default function AssayRoute() {
  const router = useRouter();
  const profile = useStudioProfile();
  const loadAssayJson = useStudioStore((state) => state.loadAssayJson);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openAssayError, setOpenAssayError] = useState<string | null>(null);
  const assayRecent = useStudioMemoryRecent("assay", pickerOpen);

  const openAssay = async (path: string) => {
    setPickerOpen(false);
    setOpening(true);
    setOpenAssayError(null);
    try {
      const contents = await runClientEffect(studioClient.readTextFile(path));
      const assayJson = parseStudioAssayJson(contents);
      loadAssayJson(assayJson);
      recordStudioAssayMemory(
        profile.session,
        path,
        assayJson.assayLabel,
        assayJson.info1.saveTo.trim() || undefined,
      );
      router.push("/info");
    } catch (cause) {
      setOpenAssayError(
        cause instanceof Error
          ? cause.message
          : "Could not open assay.json. Check the file and try again.",
      );
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
              <View className="mx-auto w-full max-w-[832px] items-center">
                {openAssayError ? (
                  <View
                    accessibilityRole="alert"
                    className="mb-4 w-full max-w-[28rem] rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2"
                  >
                    <Text className="text-sm text-destructive-foreground">{openAssayError}</Text>
                  </View>
                ) : null}
                <ChooseAssay />
              </View>
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
        description="Choose a JSON file from a prior Studio export."
        hostPort={studioHostOperations}
        mode="assay_json_file"
        open={pickerOpen}
        recentItems={assayRecent.assays.map((entry) => ({
          path: entry.path,
          label: entry.assayLabel,
        }))}
        title="Open assay.json"
        onOpenChange={setPickerOpen}
        onPickDirectory={() => undefined}
        onPickFile={(path) => void openAssay(path)}
        onPickRecent={(path) => void openAssay(path)}
      />
    </AppShell>
  );
}

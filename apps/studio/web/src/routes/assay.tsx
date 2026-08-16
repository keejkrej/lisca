import { runClientEffect } from "@lisca/client/runtime";
import { touchStudioWorkSessionFromAssayPath } from "@lisca/client/session/work-session";
import { HostFilePickerDialog } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/solid-router";
import { createMemo, createSignal, Show } from "solid-js";

import { studioClient, studioHostOperations } from "../api/studio-port";
import { ChooseAssay } from "../components/choose-assay";
import { StudioAssayActions } from "../components/studio-assay-dock";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import { instructionForStep } from "../state/studio-routes";
import { useStudioMemoryRecent } from "../hooks/use-studio-memory-recent";
import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { assayDisplayLabel, parseStudioAssayJson, useStudioStore } from "../state/studio-store";
import { recordStudioAssayMemory } from "../utils/studio-memory";

export const Route = createFileRoute("/assay")({
  component: AssayPage,
});

function AssayPage() {
  const { navigateTo } = useStudioNavigate();
  const loadAssayJson = useStudioStore((state) => state.loadAssayJson);
  const [openingAssay, setOpeningAssay] = createSignal(false);
  const [assayPickerOpen, setAssayPickerOpen] = createSignal(false);
  const [openAssayError, setOpenAssayError] = createSignal<string | null>(null);
  const assayRecent = createMemo(() => useStudioMemoryRecent("assay", assayPickerOpen()));

  const openAssayJson = async (path: string) => {
    setAssayPickerOpen(false);
    setOpeningAssay(true);
    setOpenAssayError(null);
    try {
      const contents = await runClientEffect(studioClient.readTextFile(path));
      const assayJson = parseStudioAssayJson(contents);
      loadAssayJson()(assayJson);
      const label = assayDisplayLabel(assayJson);
      touchStudioWorkSessionFromAssayPath(path, label);
      recordStudioAssayMemory(path, label, assayJson.workspace.path.trim() || undefined);
      navigateTo("/info");
    } catch (cause) {
      setOpenAssayError(
        cause instanceof Error
          ? cause.message
          : "Could not open assay.json. Check the file and try again.",
      );
    } finally {
      setOpeningAssay(false);
    }
  };

  return (
    <AppShell variant="stage">
      <AppShell.Body>
        <AppShell.Left widthClass="w-64">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.TopBar>
            <StudioTopBar />
          </AppShell.TopBar>
          <AppShell.Main>
            <AppShell.MainScroll contentClass="max-w-[52rem] items-center justify-center px-4 py-6 md:px-12 md:py-10">
              <Show when={openAssayError()}>
                {(error) => (
                  <p
                    class="z-destructive-surface mb-4 w-full max-w-[28rem] rounded-lg px-3 py-2 text-sm"
                    role="alert"
                  >
                    {error()}
                  </p>
                )}
              </Show>
              <ChooseAssay />
            </AppShell.MainScroll>
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-64">
          <StudioRightPanel instruction={() => instructionForStep("chooseAssay")}>
            <StudioAssayActions
              assayPickerOpen={assayPickerOpen()}
              openingAssay={openingAssay()}
              onOpenAssay={() => setAssayPickerOpen(true)}
            />
          </StudioRightPanel>
        </AppShell.Right>
      </AppShell.Body>
      <HostFilePickerDialog
        description="Choose a saved assay.json to resume."
        hostPort={studioHostOperations}
        mode="assay_json_file"
        open={assayPickerOpen()}
        recentItems={assayRecent().assays.map((entry) => ({
          path: entry.path,
          label: entry.assayLabel,
        }))}
        title="Open existing assay"
        onOpenChange={setAssayPickerOpen}
        onPickDirectory={() => {}}
        onPickFile={(path) => void openAssayJson(path)}
        onPickRecent={(path) => void openAssayJson(path)}
      />
    </AppShell>
  );
}

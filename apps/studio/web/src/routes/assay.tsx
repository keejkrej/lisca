import { runClientEffect } from "@lisca/client/runtime";
import { touchStudioWorkSessionFromAssayPath } from "@lisca/client/session/work-session";
import { HostFilePickerDialog } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { studioClient, studioHostOperations } from "../api/studio-port";
import { ChooseAssay } from "../components/choose-assay";
import { StudioAssayDock } from "../components/studio-assay-dock";
import { StudioLeft } from "../components/studio-left";
import { useStudioMemoryRecent } from "../hooks/use-studio-memory-recent";
import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { parseStudioAssayJson, useStudioStore } from "../state/studio-store";
import { recordStudioAssayMemory } from "../utils/studio-memory";

export const Route = createFileRoute("/assay")({
  component: AssayPage,
});

function AssayPage() {
  const { navigateTo } = useStudioNavigate();
  const loadAssayJson = useStudioStore((state) => state.loadAssayJson);
  const [openingAssay, setOpeningAssay] = useState(false);
  const [assayPickerOpen, setAssayPickerOpen] = useState(false);
  const [openAssayError, setOpenAssayError] = useState<string | null>(null);
  const assayRecent = useStudioMemoryRecent("assay", assayPickerOpen);

  const openAssayJson = async (path: string) => {
    setAssayPickerOpen(false);
    setOpeningAssay(true);
    setOpenAssayError(null);
    try {
      const contents = await runClientEffect(studioClient.readTextFile(path));
      const assayJson = parseStudioAssayJson(contents);
      loadAssayJson(assayJson);
      touchStudioWorkSessionFromAssayPath(path, assayJson.assayLabel);
      recordStudioAssayMemory(
        path,
        assayJson.assayLabel,
        assayJson.info1.saveTo.trim() || undefined,
      );
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
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <div className="mx-auto flex min-h-full w-full min-w-0 max-w-[52rem] flex-col items-center justify-center px-4 py-6 md:px-[100px] md:py-10">
              {openAssayError ? (
                <p
                  className="mb-4 w-full max-w-[28rem] rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-destructive-foreground text-sm"
                  role="alert"
                >
                  {openAssayError}
                </p>
              ) : null}
              <ChooseAssay />
            </div>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAssayDock
              assayPickerOpen={assayPickerOpen}
              openingAssay={openingAssay}
              onOpenAssay={() => setAssayPickerOpen(true)}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
      <HostFilePickerDialog
        description="Choose a JSON file from a prior Studio export."
        hostPort={studioHostOperations}
        mode="assay_json_file"
        open={assayPickerOpen}
        recentItems={assayRecent.assays.map((entry) => ({
          path: entry.path,
          label: entry.assayLabel,
        }))}
        title="Open assay.json"
        onOpenChange={setAssayPickerOpen}
        onPickDirectory={() => {}}
        onPickFile={(path) => void openAssayJson(path)}
        onPickRecent={(path) => void openAssayJson(path)}
      />
    </AppShell>
  );
}

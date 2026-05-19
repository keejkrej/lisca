import type { StudioHostPort } from "@lisca/contracts";
import { AppShell, HostFilePickerDialog } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { studioClient } from "../api/studio-client";
import { DockButton } from "../components/dock-button";
import { DockSection } from "../components/dock-section";
import { StudioDock } from "../components/studio-dock";
import { StudioLeft } from "../components/studio-left";
import { ChooseAssay } from "../components/choose-assay";
import { instructionForStep } from "../state/studio-routes";
import { parseStudioAssayJson, useStudioStore } from "../state/studio-store";

export const Route = createFileRoute("/assay")({
  component: AssayPage,
});

function AssayPage() {
  const navigate = useNavigate();
  const hostPort = useMemo<StudioHostPort>(() => studioClient, []);
  const assayId = useStudioStore((state) => state.assayId);
  const setInfoStep = useStudioStore((state) => state.setInfoStep);
  const loadAssayJson = useStudioStore((state) => state.loadAssayJson);
  const [openingAssay, setOpeningAssay] = useState(false);
  const [assayPickerOpen, setAssayPickerOpen] = useState(false);

  const openAssayJson = async (path: string) => {
    setAssayPickerOpen(false);
    setOpeningAssay(true);
    try {
      const contents = await hostPort.readTextFile(path);
      loadAssayJson(parseStudioAssayJson(contents));
      await navigate({ to: "/info" });
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : String(cause));
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
              <ChooseAssay />
            </div>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction={instructionForStep("chooseAssay")}
              action={
                <DockButton
                  disabled={!assayId}
                  onClick={() => {
                    void navigate({ to: "/info" }).then(() => setInfoStep(1));
                  }}
                >
                  Next
                </DockButton>
              }
              assay={
                <DockSection>
                  <DockButton disabled={openingAssay} onClick={() => setAssayPickerOpen(true)}>
                    Open assay
                  </DockButton>
                </DockSection>
              }
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
      <HostFilePickerDialog
        description="Choose a JSON file from a prior Studio export."
        hostPort={hostPort}
        mode="assay_json_file"
        open={assayPickerOpen}
        title="Open assay.json"
        onOpenChange={setAssayPickerOpen}
        onPickDirectory={() => {}}
        onPickFile={(path) => void openAssayJson(path)}
      />
    </AppShell>
  );
}

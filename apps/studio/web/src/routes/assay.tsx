import { runClientEffect } from "@lisca/client/runtime";
import { AppShell, DockButton, DockToolGrid, HostFilePickerDialog, RouteLoadingFallback } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { studioClient, studioHostOperations } from "../api/studio-port";
import { StudioDock } from "../components/studio-dock";
import { StudioLeft } from "../components/studio-left";
import { ChooseAssay } from "../components/choose-assay";
import { instructionForStep } from "../state/studio-routes";
import { parseStudioAssayJson, useStudioStore } from "../state/studio-store";

export const Route = createFileRoute("/assay")({
  component: AssayPage,
  pendingComponent: RouteLoadingFallback,
  pendingMs: 0,
});

function AssayPage() {
  const { navigateTo } = useStudioNavigate();
  const assayId = useStudioStore((state) => state.assayId);
  const setInfoStep = useStudioStore((state) => state.setInfoStep);
  const loadAssayJson = useStudioStore((state) => state.loadAssayJson);
  const [openingAssay, setOpeningAssay] = useState(false);
  const [assayPickerOpen, setAssayPickerOpen] = useState(false);
  const [openAssayError, setOpenAssayError] = useState<string | null>(null);

  const toolActions = useMemo(
    () => [
      {
        id: "open-assay",
        label: "Open assay",
        disabled: openingAssay || assayPickerOpen,
        onSelect: () => setAssayPickerOpen(true),
      },
    ],
    [assayPickerOpen, openingAssay],
  );

  const openAssayJson = async (path: string) => {
    setAssayPickerOpen(false);
    setOpeningAssay(true);
    setOpenAssayError(null);
    try {
      const contents = await runClientEffect(studioClient.readTextFile(path));
      loadAssayJson(parseStudioAssayJson(contents));
      navigateTo("/info");
    } catch (cause) {
      setOpenAssayError(
        cause instanceof Error ? cause.message : "Could not open assay.json. Check the file and try again.",
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
                <p className="mb-4 w-full max-w-[28rem] rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-destructive-foreground text-sm" role="alert">
                  {openAssayError}
                </p>
              ) : null}
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
                    navigateTo("/info");
                    setInfoStep(1);
                  }}
                >
                  Next
                </DockButton>
              }
              tool={
                <DockToolGrid actions={toolActions} columns={1} enabled={!assayPickerOpen} />
              }
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
        title="Open assay.json"
        onOpenChange={setAssayPickerOpen}
        onPickDirectory={() => {}}
        onPickFile={(path) => void openAssayJson(path)}
      />
    </AppShell>
  );
}

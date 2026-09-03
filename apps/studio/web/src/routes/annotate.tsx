import { LabelCreationDialog } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/solid-router";

import { StudioAnnotateMain } from "../components/studio-annotate-main";
import { StudioAnnotateInstrumentStack } from "../components/studio-annotate-instrument-stack";
import { instructionForAnnotate } from "../state/studio-routes";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import { useStudioAnnotateShell } from "../state/studio-annotate-page-selectors";
import { StudioAnnotatePageProvider } from "../state/studio-annotate-page-context";

export const Route = createFileRoute("/annotate")({
  component: AnnotatePage,
});

function AnnotatePage() {
  return (
    <StudioAnnotatePageProvider>
      <AnnotatePageContent />
    </StudioAnnotatePageProvider>
  );
}

function AnnotatePageContent() {
  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-64">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.TopBar>
            <StudioTopBar showExpert />
          </AppShell.TopBar>
          <AppShell.Main>
            <StudioAnnotateMain />
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-64">
          <StudioRightPanel
            expert={() => <StudioAnnotateInstrumentStack showShuffle />}
            instruction={instructionForAnnotate}
          >
            <StudioAnnotateInstrumentStack showShuffle={false} />
          </StudioRightPanel>
        </AppShell.Right>
      </AppShell.Body>
      <AnnotateDialogs />
    </AppShell>
  );
}

function AnnotateDialogs() {
  const shell = useStudioAnnotateShell();
  return (
    <LabelCreationDialog
      error={shell.labelError}
      labels={shell.labels}
      open={shell.labelDialogOpen}
      saving={shell.saveLabelsPending}
      workspacePath={shell.workspacePath}
      onOpenChange={shell.setLabelDialogOpen}
      onSave={(nextLabels) => void shell.handleSaveLabels(nextLabels)}
    />
  );
}

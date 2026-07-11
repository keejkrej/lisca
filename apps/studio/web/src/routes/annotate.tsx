import { LabelCreationDialog } from "@lisca/ui/features";
import { AppShell } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/solid-router";

import { StudioAnnotateDock } from "../components/studio-annotate-dock";
import { StudioAnnotateMain } from "../components/studio-annotate-main";
import { StudioAnnotateRight } from "../components/studio-annotate-right";
import { StudioAnnotateExpertRight } from "../components/studio-annotate-expert-right";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
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
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAnnotateMain />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAnnotateDock />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <StudioRightPanel expert={() => <StudioAnnotateExpertRight />}>
            <StudioAnnotateRight />
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

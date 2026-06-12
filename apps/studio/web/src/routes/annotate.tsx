import { LabelCreationDialog } from "@lisca/ui/features";
import { AppShell, RouteLoadingFallback } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";

import { StudioAnnotateDock } from "../components/studio-annotate-dock";
import { StudioAnnotateMain } from "../components/studio-annotate-main";
import { StudioAnnotateNav } from "../components/studio-annotate-nav";
import { StudioAnnotateRight } from "../components/studio-annotate-right";
import { StudioLeft } from "../components/studio-left";
import { StudioAnnotatePageProvider, useStudioAnnotatePage } from "../state/studio-annotate-page-context";

export const Route = createFileRoute("/annotate")({
  component: AnnotatePage,
  pendingComponent: RouteLoadingFallback,
  pendingMs: 0,
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
            <div className="flex min-h-0 flex-1">
              <StudioAnnotateNav />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <StudioAnnotateMain />
              </div>
            </div>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAnnotateDock />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <StudioAnnotateRight />
        </AppShell.Right>
      </AppShell.Body>
      <AnnotateDialogs />
    </AppShell>
  );
}

function AnnotateDialogs() {
  const { state } = useStudioAnnotatePage();
  return (
    <LabelCreationDialog
      error={state.labelError}
      labels={state.labels}
      open={state.labelDialogOpen}
      saving={state.saveLabelsPending}
      workspacePath={state.workspacePath}
      onOpenChange={state.setLabelDialogOpen}
      onSave={(nextLabels) => void state.handleSaveLabels(nextLabels)}
    />
  );
}

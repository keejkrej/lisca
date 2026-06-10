import { AppShell, RouteLoadingFallback } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";

import { StudioAnnotateDock } from "../components/studio-annotate-dock";
import { StudioAnnotateMain } from "../components/studio-annotate-main";
import { StudioLeft } from "../components/studio-left";
import { StudioAnnotatePageProvider } from "../state/studio-annotate-page-context";

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
            <StudioAnnotateMain />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAnnotateDock />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}

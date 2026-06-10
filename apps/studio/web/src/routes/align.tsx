import { AppShell, RouteLoadingFallback } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";

import { StudioAlignDock } from "../components/studio-align-dock";
import { StudioAlignMain } from "../components/studio-align-main";
import { StudioLeft } from "../components/studio-left";
import { StudioAlignPageProvider } from "../state/studio-align-page-context";

export const Route = createFileRoute("/align")({
  component: AlignPage,
  pendingComponent: RouteLoadingFallback,
  pendingMs: 0,
});

function AlignPage() {
  return (
    <StudioAlignPageProvider>
      <AlignPageContent />
    </StudioAlignPageProvider>
  );
}

function AlignPageContent() {
  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAlignMain />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioAlignDock />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}

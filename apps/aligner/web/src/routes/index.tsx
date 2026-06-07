import { AppShell, RouteLoadingFallback } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";

import { AlignerDock } from "../components/aligner-dock";
import { AlignerHeader } from "../components/aligner-header";
import { AlignerLeft } from "../components/aligner-left";
import { AlignerMain } from "../components/aligner-main";
import { AlignerRight } from "../components/aligner-right";
import { AlignPageProvider } from "../state/align-page-context";

export const Route = createFileRoute("/")({
  component: AlignPage,
  pendingComponent: RouteLoadingFallback,
  pendingMs: 0,
});

function AlignPage() {
  return (
    <AlignPageProvider>
      <AppShell>
        <AppShell.Header>
          <AlignerHeader />
        </AppShell.Header>
        <AppShell.Body>
          <AppShell.Left widthClass="w-72">
            <AlignerLeft />
          </AppShell.Left>
          <AppShell.MainColumn>
            <AppShell.Main>
              <AlignerMain />
            </AppShell.Main>
            <AppShell.Dock>
              <AlignerDock />
            </AppShell.Dock>
          </AppShell.MainColumn>
          <AppShell.Right widthClass="w-72">
            <AlignerRight />
          </AppShell.Right>
        </AppShell.Body>
      </AppShell>
    </AlignPageProvider>
  );
}

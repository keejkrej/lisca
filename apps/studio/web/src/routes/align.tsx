import { AppShell } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/solid-router";

import { StudioAlignDock } from "../components/studio-align-dock";
import { StudioAlignMain } from "../components/studio-align-main";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioAlignExpertRight } from "../components/studio-align-expert-right";
import { StudioAlignPageProvider } from "../state/studio-align-page-context";

export const Route = createFileRoute("/align")({
  component: AlignPage,
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
        <AppShell.Right widthClass="w-72">
          <StudioRightPanel expert={() => <StudioAlignExpertRight />} />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}

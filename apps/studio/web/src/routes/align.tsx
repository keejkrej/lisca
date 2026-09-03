import { AppShell } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/solid-router";

import { StudioAlignInstrumentStack } from "../components/studio-align-instrument-stack";
import { StudioAlignMain } from "../components/studio-align-main";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import { instructionForStep } from "../state/studio-routes";
import { StudioAlignPageProvider } from "../state/studio-align-page-provider";

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
        <AppShell.Left widthClass="w-64">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.TopBar>
            <StudioTopBar showExpert />
          </AppShell.TopBar>
          <AppShell.Main>
            <StudioAlignMain />
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-64">
          <StudioRightPanel
            expert={() => <StudioAlignInstrumentStack />}
            instruction={() => instructionForStep("alignPattern")}
          >
            <StudioAlignInstrumentStack />
          </StudioRightPanel>
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}

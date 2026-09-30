import { AppShell } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/solid-router";

import { studioHostOperations } from "../api/studio-port";
import { MetadataFields } from "../components/metadata-fields";
import { MetadataSamples } from "../components/metadata-samples";
import { StudioMetadataActions } from "../components/studio-metadata-actions";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import { instructionForStep } from "../state/studio-routes";

export const Route = createFileRoute("/metadata")({
  component: MetadataPage,
});

function MetadataPage() {
  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-64">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.TopBar>
            <StudioTopBar />
          </AppShell.TopBar>
          <AppShell.Main>
            <AppShell.MainScroll contentClass="max-w-[52rem] items-center gap-10 px-4 py-6 md:px-12 md:py-10">
              <MetadataFields hostPort={studioHostOperations} />
              <MetadataSamples />
            </AppShell.MainScroll>
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-64">
          <StudioRightPanel instruction={() => instructionForStep("metadata")}>
            <StudioMetadataActions />
          </StudioRightPanel>
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}

import { AppShell } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";

import { StudioLeft } from "../components/studio-left";
import { StudioPlaceholder } from "../components/studio-placeholder";

export const Route = createFileRoute("/inspect")({
  component: InspectPage,
});

function InspectPage() {
  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioPlaceholder title="Inspect ROI" />
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}

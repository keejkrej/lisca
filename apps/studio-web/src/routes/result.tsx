import { AppShell } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";

import { StudioNavRail } from "../components/studio-nav-rail";
import { StudioPlaceholder } from "../components/studio-placeholder";

export const Route = createFileRoute("/result")({
  component: ResultPage,
});

function ResultPage() {
  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioNavRail />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioPlaceholder title="Results" />
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}

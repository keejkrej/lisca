import { AppShell } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";

import { Navbar } from "../components/navbar";
import { BottomPanel, LeftPanel, MainPanel, RightPanel, useAlignState } from "../components/panels";

export const Route = createFileRoute("/align")({
  component: AlignPage,
});

function AlignPage() {
  const alignState = useAlignState();

  return (
    <AppShell>
      <AppShell.Header>
        <Navbar routeId="align" onSourcePicked={alignState.setSource} />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left widthClass="w-72">
          <LeftPanel alignState={alignState} routeId="align" />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <MainPanel alignState={alignState} routeId="align" />
          </AppShell.Main>
          <AppShell.Dock>
            <BottomPanel alignState={alignState} routeId="align" />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <RightPanel alignState={alignState} routeId="align" />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}

import { AppShell } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";

import { Navbar } from "../components/navbar";
import { BottomPanel, LeftPanel, MainPanel, RightPanel, useAlignState } from "../components/panels";

export const Route = createFileRoute("/")({
  component: AlignPage,
});

function AlignPage() {
  const alignState = useAlignState();

  return (
    <AppShell>
      <AppShell.Header>
        <Navbar onSourcePicked={alignState.setSource} />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left widthClass="w-72">
          <LeftPanel alignState={alignState} />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <MainPanel alignState={alignState} />
          </AppShell.Main>
          <AppShell.Dock>
            <BottomPanel alignState={alignState} />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <RightPanel alignState={alignState} />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}

import { AppShell } from "@lisca/ui";

import { Navbar } from "./navbar";
import { BottomPanel, LeftPanel, MainPanel, RightPanel, useAlignState } from "./panels";
import type { RouteId } from "../types";

export function ShellPage(props: { routeId: RouteId }) {
  const alignState = useAlignState();

  return (
    <AppShell>
      <AppShell.Header>
        <Navbar routeId={props.routeId} onSourcePicked={alignState.setSource} />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left widthClass="w-72">
          <LeftPanel alignState={alignState} routeId={props.routeId} />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <MainPanel alignState={alignState} routeId={props.routeId} />
          </AppShell.Main>
          <AppShell.Dock>
            <BottomPanel alignState={alignState} routeId={props.routeId} />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <RightPanel alignState={alignState} routeId={props.routeId} />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}

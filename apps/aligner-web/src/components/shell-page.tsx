import { AppShell } from "@lisca/ui";

import { Navbar } from "./navbar";
import { BottomPanel, LeftPanel, MainPanel, RightPanel } from "./panels";
import type { RouteId } from "../types";

export function ShellPage(props: { routeId: RouteId }) {
  return (
    <AppShell>
      <AppShell.Header>
        <Navbar routeId={props.routeId} />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left>
          <LeftPanel routeId={props.routeId} />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <MainPanel routeId={props.routeId} />
          </AppShell.Main>
          <AppShell.Dock>
            <BottomPanel routeId={props.routeId} />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right>
          <RightPanel routeId={props.routeId} />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}

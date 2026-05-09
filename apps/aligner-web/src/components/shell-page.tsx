import { AppShell } from "@lisca/ui";

import { Navbar } from "./navbar";
import { BottomPanel, LeftPanel, MainPanel, RightPanel } from "./panels";
import type { RouteId } from "../types";

export function ShellPage(props: { routeId: RouteId }) {
  return (
    <AppShell>
      <AppShell.Top>
        <Navbar routeId={props.routeId} />
      </AppShell.Top>
      <AppShell.Left>
        <LeftPanel routeId={props.routeId} />
      </AppShell.Left>
      <AppShell.Main>
        <MainPanel routeId={props.routeId} />
      </AppShell.Main>
      <AppShell.Bottom>
        <BottomPanel routeId={props.routeId} />
      </AppShell.Bottom>
      <AppShell.Right>
        <RightPanel routeId={props.routeId} />
      </AppShell.Right>
    </AppShell>
  );
}

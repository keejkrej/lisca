import { AppShell } from "@lisca/ui";

import { Navbar } from "./navbar";
import { BottomPanel, LeftPanel, MainPanel, RightPanel, useAlignDemoState } from "./panels";
import type { RouteId } from "../types";

export function ShellPage(props: { routeId: RouteId }) {
  const alignDemo = useAlignDemoState();

  return (
    <AppShell>
      <AppShell.Header>
        <Navbar routeId={props.routeId} />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left widthClass="w-72">
          <LeftPanel alignDemo={alignDemo} routeId={props.routeId} />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <MainPanel alignDemo={alignDemo} routeId={props.routeId} />
          </AppShell.Main>
          {props.routeId === "align" ? null : (
            <AppShell.Dock>
              <BottomPanel alignDemo={alignDemo} routeId={props.routeId} />
            </AppShell.Dock>
          )}
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <RightPanel alignDemo={alignDemo} routeId={props.routeId} />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}

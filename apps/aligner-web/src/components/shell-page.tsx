import { AppShell, ShellThemeToggle } from "@lisca/ui";

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
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-300 px-3 py-2 dark:border-neutral-700">
            <ShellThemeToggle />
            <span className="truncate text-muted-foreground text-[0.65rem] uppercase tracking-wide">
              {props.routeId}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <LeftPanel routeId={props.routeId} />
          </div>
        </div>
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

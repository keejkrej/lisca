import { ConnectionStatus, Panel, ShellThemeToggle, useShellServer } from "@lisca/ui/shell";
import { useRouterState } from "@tanstack/react-router";

import { NavButton } from "./studio-nav-button";

export function StudioNavRail() {
  const server = useShellServer();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeId = pathname.slice(1) || "assay";

  return (
    <nav aria-label="Primary" className="flex h-full min-h-0 flex-col items-stretch gap-2.5 p-2.5">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <Panel className="w-full shrink-0">
          <div className="flex flex-col items-center gap-6 p-3">
            <NavButton active={routeId === "assay"} to="/assay">
              Choose assay
            </NavButton>
            <NavButton active={routeId === "info"} to="/info">
              Basic info
            </NavButton>
            <NavButton active={routeId === "align"} to="/align">
              Align pattern
            </NavButton>
            <NavButton active={routeId === "annotate"} to="/annotate">
              Annotate ROI
            </NavButton>
            <NavButton active={routeId === "result"} to="/result">
              View results
            </NavButton>
          </div>
        </Panel>
      </div>
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center">
        <div />
        <ConnectionStatus
          state={server.state}
          wsUrl={server.wsUrl}
          onOpenSettings={server.openSettings}
        />
        <div className="justify-self-end">
          <ShellThemeToggle />
        </div>
      </div>
    </nav>
  );
}

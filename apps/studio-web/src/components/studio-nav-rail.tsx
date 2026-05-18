import { ConnectionStatus, ShellThemeToggle, useShellWsProbe } from "@lisca/ui";
import { useRouterState } from "@tanstack/react-router";

import { NavButton } from "./studio-nav-button";

export function StudioNavRail() {
  const ws = useShellWsProbe({ defaultPort: 8767 });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeId = pathname.slice(1) || "assay";

  return (
    <nav
      aria-label="Primary"
      className="flex h-full min-h-0 flex-col items-stretch bg-card/32 p-2.5"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto">
        <NavButton active={routeId === "assay"} to="/assay">
          Choose assay
        </NavButton>
        <NavButton active={routeId === "info"} to="/info">
          Basic info
        </NavButton>
        <NavButton active={routeId === "align"} to="/align">
          Align pattern
        </NavButton>
        <NavButton active={routeId === "inspect"} to="/inspect">
          Inspect ROI
        </NavButton>
        <NavButton active={routeId === "result"} to="/result">
          View results
        </NavButton>
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-border/60 pt-2.5">
        <ConnectionStatus wsUrl={ws.wsUrl} state={ws.state} />
        <div className="ml-auto shrink-0">
          <ShellThemeToggle />
        </div>
      </div>
    </nav>
  );
}

import { buttonVariants, cn } from "@lisca/ui/components";
import { ConnectionStatus, Panel, ShellThemeToggle, useShellServer } from "@lisca/ui/shell";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { studioNavigate, type StudioRouteTo } from "../navigation/use-studio-navigate";
import { confirmStudioAnnotateLeave } from "../state/studio-annotate-guard";
import { useStudioProfile } from "./studio-profile-provider";

const navButtonClass =
  "h-auto w-auto min-w-0 max-w-full shrink-0 rounded-lg px-5 py-2.5 text-xl font-medium";

function NavButton({
  active,
  children,
  to,
  onClick,
  leaveAnnotateGuard,
}: {
  active: boolean;
  children: ReactNode;
  to: StudioRouteTo;
  onClick?: () => void;
  leaveAnnotateGuard?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        navButtonClass,
        active ? "text-foreground" : "text-muted-foreground",
      )}
      to={to}
      onClick={(event) => {
        onClick?.();
        if (event.defaultPrevented) return;
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        if (leaveAnnotateGuard && to !== "/annotate" && !confirmStudioAnnotateLeave()) {
          return;
        }
        studioNavigate(navigate, to);
      }}
    >
      {children}
    </Link>
  );
}

export function StudioNavRail() {
  const server = useShellServer();
  const profile = useStudioProfile();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeId = pathname.slice(1) || "assay";

  return (
    <nav aria-label="Primary" className="flex h-full min-h-0 flex-col items-stretch gap-2.5 p-2.5">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <Panel className="w-full shrink-0">
          <div className="flex flex-col items-center gap-6 p-3">
            <NavButton active={routeId === "assay"} leaveAnnotateGuard={routeId === "annotate"} to="/assay">
              Assay type
            </NavButton>
            <NavButton active={routeId === "info"} leaveAnnotateGuard={routeId === "annotate"} to="/info">
              Basic info
            </NavButton>
            <NavButton active={routeId === "align"} leaveAnnotateGuard={routeId === "annotate"} to="/align">
              Align pattern
            </NavButton>
            <NavButton active={routeId === "annotate"} to="/annotate">
              Annotate ROI
            </NavButton>
            <NavButton active={routeId === "result"} leaveAnnotateGuard={routeId === "annotate"} to="/result">
              View results
            </NavButton>
          </div>
        </Panel>
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-2">
        <div className="flex justify-center">
          <ConnectionStatus
            state={server.state}
            wsUrl={server.wsUrl}
            onOpenSettings={server.openSettings}
          />
        </div>
        <div className="flex items-center justify-center gap-1">
          <button
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "min-w-0 max-w-[8rem] truncate text-muted-foreground text-xs",
            )}
            type="button"
            onClick={profile.switchProfile}
          >
            {profile.session.mode === "guest" ? "Guest" : profile.session.displayName}
          </button>
          <ShellThemeToggle />
        </div>
      </div>
    </nav>
  );
}

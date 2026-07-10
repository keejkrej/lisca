import { buttonVariants, cn } from "@lisca/ui/components";
import { ConnectionStatus, Panel, ShellThemeToggle, useShellServer } from "@lisca/ui/shell";
import { Link, useNavigate, useRouterState } from "@tanstack/solid-router";
import type { JSX } from "solid-js";

import { studioNavigate, type StudioRouteTo } from "../navigation/use-studio-navigate";
import { confirmStudioAnnotateLeave } from "../state/studio-annotate-guard";

const navButtonClass =
  "h-auto w-auto min-w-0 max-w-full shrink-0 rounded-lg px-5 py-2.5 text-xl font-medium";

function NavButton(props: {
  active: boolean;
  children: JSX.Element;
  to: StudioRouteTo;
  onClick?: () => void;
  leaveAnnotateGuard?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Link
      aria-current={props.active ? "page" : undefined}
      class={cn(
        buttonVariants({ variant: "ghost" }),
        navButtonClass,
        props.active ? "text-foreground" : "text-muted-foreground",
      )}
      to={props.to}
      onClick={(event) => {
        props.onClick?.();
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
        if (
          props.leaveAnnotateGuard &&
          props.to !== "/annotate" &&
          !confirmStudioAnnotateLeave()
        ) {
          return;
        }
        studioNavigate(navigate, props.to);
      }}
    >
      {props.children}
    </Link>
  );
}

export function StudioNavRail() {
  const server = useShellServer();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeId = () => pathname().slice(1) || "assay";

  return (
    <nav aria-label="Primary" class="flex h-full min-h-0 flex-col items-stretch gap-2.5 p-2.5">
      <div class="flex min-h-0 flex-1 flex-col items-center justify-center">
        <Panel class="w-full shrink-0">
          <div class="flex flex-col items-center gap-6 p-3">
            <NavButton
              active={routeId() === "assay"}
              leaveAnnotateGuard={routeId() === "annotate"}
              to="/assay"
            >
              Assay type
            </NavButton>
            <NavButton
              active={routeId() === "info"}
              leaveAnnotateGuard={routeId() === "annotate"}
              to="/info"
            >
              Basic info
            </NavButton>
            <NavButton
              active={routeId() === "align"}
              leaveAnnotateGuard={routeId() === "annotate"}
              to="/align"
            >
              Align pattern
            </NavButton>
            <NavButton active={routeId() === "annotate"} to="/annotate">
              Annotate ROI
            </NavButton>
            <NavButton
              active={routeId() === "result"}
              leaveAnnotateGuard={routeId() === "annotate"}
              to="/result"
            >
              View results
            </NavButton>
          </div>
        </Panel>
      </div>
      <div class="flex shrink-0 flex-row items-center justify-center gap-2">
        <ConnectionStatus
          state={server.state}
          httpBaseUrl={server.httpBaseUrl}
        />
        <ShellThemeToggle />
      </div>
    </nav>
  );
}
import { cn } from "@lisca/ui/components";
import { Link, useNavigate, useRouterState } from "@tanstack/solid-router";
import type { JSX } from "solid-js";

import { studioNavigate, type StudioRouteTo } from "../navigation/use-studio-navigate";
import { confirmStudioAnnotateLeave } from "../state/studio-annotate-guard";
function NavButton(props: {
  active: boolean;
  children: JSX.Element;
  index: number;
  to: StudioRouteTo;
  onClick?: () => void;
  leaveAnnotateGuard?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Link
      aria-current={props.active ? "page" : undefined}
      class={cn(
        "group flex h-9 w-full min-w-0 shrink-0 items-center gap-3 rounded-md text-left outline-none transition-colors",
        "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
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
        if (props.leaveAnnotateGuard && props.to !== "/annotate" && !confirmStudioAnnotateLeave()) {
          return;
        }
        studioNavigate(navigate, props.to);
      }}
    >
      <span aria-hidden="true" class={cn("h-4 w-0.5 shrink-0", props.active && "bg-primary")} />
      <span
        aria-hidden="true"
        class={cn(
          "w-[22px] shrink-0 text-[11px] leading-[14px] tabular-nums",
          props.active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {String(props.index).padStart(2, "0")}
      </span>
      <span
        class={cn(
          "min-w-0 truncate text-sm leading-[18px]",
          props.active ? "font-semibold" : "font-normal",
        )}
      >
        {props.children}
      </span>
    </Link>
  );
}

export function StudioNavRail() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeId = () => pathname().slice(1) || "assay";

  return (
    <nav aria-label="Primary" class="flex h-full min-h-0 flex-col justify-center px-7 py-2.5">
      <div class="flex w-[200px] shrink-0 flex-col">
        <NavButton
          active={routeId() === "assay"}
          index={1}
          leaveAnnotateGuard={routeId() === "annotate"}
          to="/assay"
        >
          Assay
        </NavButton>
        <NavButton
          active={routeId() === "info"}
          index={2}
          leaveAnnotateGuard={routeId() === "annotate"}
          to="/info"
        >
          Info
        </NavButton>
        <NavButton
          active={routeId() === "align"}
          index={3}
          leaveAnnotateGuard={routeId() === "annotate"}
          to="/align"
        >
          Align
        </NavButton>
        <NavButton active={routeId() === "annotate"} index={4} to="/annotate">
          Annotate
        </NavButton>
        <NavButton
          active={routeId() === "result"}
          index={5}
          leaveAnnotateGuard={routeId() === "annotate"}
          to="/result"
        >
          Results
        </NavButton>
      </div>
    </nav>
  );
}

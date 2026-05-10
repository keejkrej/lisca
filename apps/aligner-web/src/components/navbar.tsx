import {
  Button,
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
  ShellNavbar,
  buttonVariants,
  cn,
} from "@lisca/ui";
import { useNavigate } from "@tanstack/react-router";

import type { RouteId } from "../types";

function ToolsMenuChevron(props: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ToolsMenu() {
  return (
    <Menu>
      <MenuTrigger
        className={cn(
          buttonVariants({
            size: "sm",
            variant: "outline",
            className:
              "group inline-flex w-fit shrink-0 justify-between gap-2 font-normal text-foreground shadow-none hover:bg-muted/40 data-popup-open:bg-muted/60",
          }),
        )}
      >
        Tools
        <ToolsMenuChevron className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[popup-open]:rotate-180" />
      </MenuTrigger>
      <MenuPopup
        align="end"
        className="w-56 rounded-2xl border-border p-2 shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
        side="bottom"
        sideOffset={8}
      >
        <MenuItem className="h-auto min-h-0 flex-col items-stretch gap-0.5 py-2.5 text-left">
          <span className="font-medium text-foreground text-sm">Hello</span>
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

export function Navbar(props: { routeId: RouteId }) {
  const navigate = useNavigate();

  return (
    <ShellNavbar
      wsDefaultPort={8765}
      routeItems={[
        { value: "align", label: "Align" },
      ]}
      showToolsMenu={true}
      showRouteToggle={false}
      routeValue={props.routeId}
      onRouteChange={(v: string) => navigate({ to: `/${v}` })}
      endLeading={<ToolsMenu />}
    />
  );
}

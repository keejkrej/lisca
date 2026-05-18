import { Menu, MenuItem, MenuPopup, MenuTrigger, ShellNavbar, buttonVariants, cn } from "@lisca/ui";
import { ChevronDown, Tags } from "lucide-react";

export function Navbar(props: {
  workspacePath: string | null;
  onCreateLabels: () => void;
  onPickWorkspace: () => void;
}) {
  return (
    <ShellNavbar
      wsDefaultPort={8766}
      routeItems={[{ value: "roi", label: "ROI" }]}
      routeValue="roi"
      showRouteToggle={false}
      showSourceButton={false}
      endLeading={
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
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[popup-open]:rotate-180" />
          </MenuTrigger>
          <MenuPopup
            align="end"
            className="w-60 rounded-2xl border-border p-2 shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
            side="bottom"
            sideOffset={8}
          >
            <MenuItem
              disabled={!props.workspacePath}
              className="h-auto min-h-0 items-start gap-2 py-2.5 text-left"
              onClick={props.onCreateLabels}
            >
              <Tags className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block font-medium text-foreground text-sm">Create labels</span>
                <span className="block text-muted-foreground text-xs">
                  Write annotations/labels.json
                </span>
              </span>
            </MenuItem>
          </MenuPopup>
        </Menu>
      }
      onRouteChange={() => undefined}
      onPickWorkspace={props.onPickWorkspace}
    />
  );
}

import { Menu, PanelRightClose } from "lucide-react";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { useShellLayout } from "./shell-layout-context";

export function ShellPanelToggle(props: { side: "left" | "right"; className?: string }) {
  const layout = useShellLayout();
  const open = props.side === "left" ? layout.leftOpen : layout.rightOpen;
  const hasPanels = props.side === "left" ? layout.hasLeftPanels : layout.hasRightPanels;
  const toggle = props.side === "left" ? layout.toggleLeft : layout.toggleRight;

  if (!layout.isPortrait || !hasPanels) {
    return null;
  }

  const Icon = props.side === "left" ? Menu : PanelRightClose;
  const label =
    props.side === "left"
      ? open
        ? "Close left panel"
        : "Open left panel"
      : open
        ? "Close right panel"
        : "Open right panel";

  return (
    <Button
      aria-expanded={open}
      aria-label={label}
      className={cn("pointer-events-auto shadow-sm", props.className)}
      size="icon-sm"
      type="button"
      variant="outline"
      onClick={toggle}
    >
      <Icon aria-hidden className="size-4" />
    </Button>
  );
}

export function ShellPortraitPanelControls() {
  const layout = useShellLayout();

  if (!layout.isPortrait) {
    return null;
  }

  return (
    <>
      {layout.hasLeftPanels ? (
        <div className="pointer-events-none absolute left-3 top-1/2 z-30 -translate-y-1/2">
          <ShellPanelToggle side="left" />
        </div>
      ) : null}
      {layout.hasRightPanels ? (
        <div className="pointer-events-none absolute right-3 top-1/2 z-30 -translate-y-1/2">
          <ShellPanelToggle side="right" />
        </div>
      ) : null}
    </>
  );
}

export function ShellPortraitPanelOverlays() {
  const layout = useShellLayout();

  if (!layout.isPortrait) {
    return null;
  }

  const scrimVisible = layout.leftOpen || layout.rightOpen;

  return (
    <>
      {scrimVisible ? (
        <button
          aria-label="Close side panels"
          className="absolute inset-0 z-40 bg-black/55"
          type="button"
          onClick={layout.closePanels}
        />
      ) : null}
      {layout.hasLeftPanels ? (
        <aside
          aria-hidden={!layout.leftOpen}
          aria-label="Left panel"
          className={cn(
            "absolute inset-y-0 left-0 z-50 flex max-w-[min(100%,20rem)] flex-col overflow-y-auto border-r border-border bg-background shadow-xl transition-transform duration-200 ease-out",
            layout.leftOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
          )}
        >
          {layout.leftPanels.map((panel) => (
            <div key={panel.id} className={cn("min-h-0 shrink-0", panel.widthClass ?? "w-56")}>
              {panel.content}
            </div>
          ))}
        </aside>
      ) : null}
      {layout.hasRightPanels ? (
        <aside
          aria-hidden={!layout.rightOpen}
          aria-label="Right panel"
          className={cn(
            "absolute inset-y-0 right-0 z-50 flex max-w-[min(100%,20rem)] flex-col overflow-y-auto border-l border-border bg-background shadow-xl transition-transform duration-200 ease-out",
            layout.rightOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
          )}
        >
          {layout.rightPanels.map((panel) => (
            <div key={panel.id} className={cn("min-h-0 shrink-0", panel.widthClass ?? "w-56")}>
              {panel.content}
            </div>
          ))}
        </aside>
      ) : null}
    </>
  );
}

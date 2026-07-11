import IconListRegular from "phosphor-icons-solid/IconListRegular";
import IconSidebarSimpleRegular from "phosphor-icons-solid/IconSidebarSimpleRegular";
import { For, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { useShellLayout } from "./shell-layout-context";

export function ShellPanelToggle(props: { side: "left" | "right"; class?: string }) {
  const layout = useShellLayout();
  const open = () => (props.side === "left" ? layout.leftOpen : layout.rightOpen);
  const hasPanels = () => (props.side === "left" ? layout.hasLeftPanels : layout.hasRightPanels);
  const toggle = props.side === "left" ? layout.toggleLeft : layout.toggleRight;

  const label = () =>
    props.side === "left"
      ? open()
        ? "Close left panel"
        : "Open left panel"
      : open()
        ? "Close right panel"
        : "Open right panel";

  return (
    <Show when={layout.isPortrait && hasPanels()}>
      <Button
        aria-expanded={open()}
        aria-label={label()}
        class={cn("pointer-events-auto shadow-sm", props.class)}
        size="icon-sm"
        type="button"
        variant="outline"
        onClick={toggle}
      >
        <Show when={props.side === "left"} fallback={<IconSidebarSimpleRegular class="size-4" />}>
          <IconListRegular class="size-4" />
        </Show>
      </Button>
    </Show>
  );
}

export function ShellPortraitPanelControls() {
  const layout = useShellLayout();

  return (
    <Show when={layout.isPortrait}>
      <>
        <Show when={layout.hasLeftPanels}>
          <div class="pointer-events-none absolute left-3 top-1/2 z-30 -translate-y-1/2">
            <ShellPanelToggle side="left" />
          </div>
        </Show>
        <Show when={layout.hasRightPanels}>
          <div class="pointer-events-none absolute right-3 top-1/2 z-30 -translate-y-1/2">
            <ShellPanelToggle side="right" />
          </div>
        </Show>
      </>
    </Show>
  );
}

export function ShellPortraitPanelOverlays() {
  const layout = useShellLayout();

  return (
    <Show when={layout.isPortrait}>
      <>
        <Show when={layout.leftOpen || layout.rightOpen}>
          <button
            aria-label="Close side panels"
            class="absolute inset-0 z-40 bg-black/55"
            type="button"
            onClick={layout.closePanels}
          />
        </Show>
        <Show when={layout.hasLeftPanels}>
          <aside
            aria-hidden={!layout.leftOpen}
            aria-label="Left panel"
            class={cn(
              "absolute inset-y-0 left-0 z-50 flex max-w-[min(100%,20rem)] flex-col overflow-y-auto border-r border-border bg-background shadow-xl transition-transform duration-200 ease-out",
              layout.leftOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
            )}
          >
            <For each={layout.leftPanels}>
              {(panel) => (
                <div class={cn("flex min-h-0 flex-1 flex-col", panel.widthClass ?? "w-56")}>{panel.content}</div>
              )}
            </For>
          </aside>
        </Show>
        <Show when={layout.hasRightPanels}>
          <aside
            aria-hidden={!layout.rightOpen}
            aria-label="Right panel"
            class={cn(
              "absolute inset-y-0 right-0 z-50 flex max-w-[min(100%,20rem)] flex-col overflow-y-auto border-l border-border bg-background shadow-xl transition-transform duration-200 ease-out",
              layout.rightOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
            )}
          >
            <For each={layout.rightPanels}>
              {(panel) => (
                <div class={cn("flex min-h-0 flex-1 flex-col", panel.widthClass ?? "w-56")}>{panel.content}</div>
              )}
            </For>
          </aside>
        </Show>
      </>
    </Show>
  );
}
import { cn, ScrollArea } from "@lisca/ui/components";
import type { JSX } from "solid-js";

/**
 * Landing/browser demo chrome: header + full-bleed body. Not the instrument
 * `AppShell` paper pane — demos are allowed to deviate from the Tauri apps.
 */
function DemoShellRoot(props: { children?: JSX.Element }) {
  return (
    <div class="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      {props.children}
    </div>
  );
}
DemoShellRoot.displayName = "DemoShell";

function DemoShellHeader(props: { children?: JSX.Element }) {
  return (
    <header
      aria-label="Application header"
      class="flex h-16 shrink-0 flex-col overflow-hidden border-b border-border bg-background"
    >
      <ScrollArea class="min-h-0 flex-1" contentClass="h-full">
        {props.children}
      </ScrollArea>
    </header>
  );
}
DemoShellHeader.displayName = "DemoShell.Header";

function DemoShellBody(props: { children?: JSX.Element }) {
  return (
    <div class="relative flex min-h-0 flex-1 overflow-hidden bg-background">{props.children}</div>
  );
}
DemoShellBody.displayName = "DemoShell.Body";

function DemoShellMainColumn(props: { children?: JSX.Element }) {
  return (
    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      {props.children}
    </div>
  );
}
DemoShellMainColumn.displayName = "DemoShell.MainColumn";

function DemoShellLeft(props: { children?: JSX.Element; widthClass?: string }) {
  return (
    <aside
      aria-label="Left panel"
      class={cn(
        "flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-background",
        props.widthClass ?? "w-56",
      )}
    >
      <ScrollArea class="min-h-0 flex-1" contentClass="flex h-full flex-col">
        {props.children}
      </ScrollArea>
    </aside>
  );
}
DemoShellLeft.displayName = "DemoShell.Left";

function DemoShellRight(props: { children?: JSX.Element; widthClass?: string }) {
  return (
    <aside
      aria-label="Right panel"
      class={cn(
        "flex min-h-0 shrink-0 flex-col overflow-hidden border-l border-border bg-background",
        props.widthClass ?? "w-56",
      )}
    >
      <ScrollArea class="min-h-0 flex-1" contentClass="flex h-full flex-col">
        {props.children}
      </ScrollArea>
    </aside>
  );
}
DemoShellRight.displayName = "DemoShell.Right";

function DemoShellMain(props: { children?: JSX.Element }) {
  return (
    <main class="relative min-h-0 flex-1 overflow-hidden bg-background" id="main-content">
      <ScrollArea class="h-full" contentClass="flex flex-col">
        {props.children}
      </ScrollArea>
    </main>
  );
}
DemoShellMain.displayName = "DemoShell.Main";

function DemoShellMainScroll(props: { children?: JSX.Element; contentClass?: string }) {
  return (
    <div class="flex min-h-full min-w-0 w-full flex-1 flex-col overflow-visible">
      <div
        class={cn("mx-auto flex min-h-full w-full min-w-0 shrink-0 flex-col", props.contentClass)}
      >
        {props.children}
      </div>
    </div>
  );
}
DemoShellMainScroll.displayName = "DemoShell.MainScroll";

function DemoShellDock(props: { children?: JSX.Element }) {
  return (
    <div
      aria-label="Dock"
      class="flex h-[11rem] shrink-0 flex-col overflow-hidden border-t border-border bg-background"
      role="region"
    >
      <ScrollArea class="min-h-0 flex-1" contentClass="h-full">
        {props.children}
      </ScrollArea>
    </div>
  );
}
DemoShellDock.displayName = "DemoShell.Dock";

export type DemoShellCompound = typeof DemoShellRoot & {
  Header: typeof DemoShellHeader;
  Body: typeof DemoShellBody;
  MainColumn: typeof DemoShellMainColumn;
  Left: typeof DemoShellLeft;
  Main: typeof DemoShellMain;
  MainScroll: typeof DemoShellMainScroll;
  Dock: typeof DemoShellDock;
  Right: typeof DemoShellRight;
};

export const DemoShell: DemoShellCompound = Object.assign(DemoShellRoot, {
  Header: DemoShellHeader,
  Body: DemoShellBody,
  MainColumn: DemoShellMainColumn,
  Left: DemoShellLeft,
  Main: DemoShellMain,
  MainScroll: DemoShellMainScroll,
  Dock: DemoShellDock,
  Right: DemoShellRight,
});

import {
  children as resolveChildren,
  createEffect,
  createUniqueId,
  onCleanup,
  Show,
  type JSX,
} from "solid-js";

import { cn } from "../../lib/utils";
import { ShellLayoutProvider, useShellLayout } from "./shell-layout-context";
import { ShellPortraitPanelControls, ShellPortraitPanelOverlays } from "./shell-portrait-panels";

const shellDivider = "border-border";
const shellSurface = "bg-background";
const shellSheetSurface =
  "rounded-2xl bg-background shadow-[0_1px_2px_#0000000a,0_8px_24px_#0000000f]";

/** Fixed-height dock strip (`11rem`); scrolls inside if content overflows. */
const shellDockFixed = "flex h-[11rem] shrink-0 flex-col overflow-hidden";

function ShellDockInner(props: { children?: JSX.Element; class?: string }) {
  return (
    <div
      role="region"
      aria-label="Dock"
      class={cn(shellDockFixed, "border-t", shellDivider, shellSurface, props.class)}
    >
      <div class="min-h-0 flex-1 overflow-auto">{props.children}</div>
    </div>
  );
}

function ShellSidebarInner(props: {
  side: "left" | "right";
  children?: JSX.Element;
  widthClass?: string;
}) {
  const widthClass = () => props.widthClass ?? "w-64";
  return (
    <aside
      aria-label={props.side === "left" ? "Left panel" : "Right panel"}
      class={cn("flex h-full min-h-0 shrink-0 flex-col overflow-hidden bg-muted", widthClass())}
    >
      {props.children}
    </aside>
  );
}

function useRegisterShellPanel(props: {
  side: "left" | "right";
  children: () => JSX.Element;
  widthClass?: string;
}) {
  const layout = useShellLayout();
  const id = createUniqueId();
  const widthClass = () => props.widthClass ?? "w-64";

  createEffect(() => {
    if (!layout.isPortrait) {
      return;
    }
    const register = props.side === "left" ? layout.registerLeftPanel : layout.registerRightPanel;
    const cleanup = register({
      id,
      widthClass: widthClass(),
      content: props.children(),
    });
    onCleanup(cleanup);
  });
}

function SkipToMainLink() {
  return (
    <a
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      href="#main-content"
    >
      Skip to main content
    </a>
  );
}

function AppShellRoot(props: { children?: JSX.Element }) {
  return (
    <ShellLayoutProvider>
      <div class="lisca-instrument-shell flex h-full min-h-0 flex-col overflow-clip bg-muted py-4 text-xs leading-4 text-foreground">
        <SkipToMainLink />
        {props.children}
      </div>
    </ShellLayoutProvider>
  );
}
AppShellRoot.displayName = "AppShell";

/** Floating 56px header surface. Place it inside `MainColumn`. */
function AppShellTopBar(props: { children?: JSX.Element; class?: string }) {
  return (
    <div
      class={cn(
        "flex h-14 w-full shrink-0 flex-col overflow-hidden px-5",
        shellSheetSurface,
        props.class,
      )}
      data-slot="app-shell-top-bar"
    >
      <div class="min-h-0 flex-1 overflow-auto">{props.children}</div>
    </div>
  );
}
AppShellTopBar.displayName = "AppShell.TopBar";

/**
 * Horizontal band: left rail, main column (TopBar + Main + optional dock), right rail.
 */
function AppShellBody(props: { children?: JSX.Element }) {
  return (
    <div class="relative flex min-h-0 flex-1 overflow-hidden bg-muted">
      {props.children}
      <ShellPortraitPanelOverlays />
    </div>
  );
}
AppShellBody.displayName = "AppShell.Body";

/** Center stack: floating `TopBar`, paper `Main`, optional `Dock`. */
function AppShellMainColumn(props: { children?: JSX.Element }) {
  return (
    <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-visible bg-muted">
      {props.children}
    </div>
  );
}
AppShellMainColumn.displayName = "AppShell.MainColumn";

function AppShellLeft(props: {
  children?: JSX.Element;
  /** Tailwind width utility; defaults to `w-64` (256px). */
  widthClass?: string;
}) {
  const content = resolveChildren(() => props.children);
  useRegisterShellPanel({ side: "left", children: content, widthClass: props.widthClass });
  const layout = useShellLayout();

  return (
    <Show when={!layout.isPortrait}>
      <ShellSidebarInner side="left" widthClass={props.widthClass}>
        {content()}
      </ShellSidebarInner>
    </Show>
  );
}
AppShellLeft.displayName = "AppShell.Left";

function AppShellRight(props: {
  children?: JSX.Element;
  /** Tailwind width utility; defaults to `w-64` (256px). */
  widthClass?: string;
}) {
  const content = resolveChildren(() => props.children);
  useRegisterShellPanel({ side: "right", children: content, widthClass: props.widthClass });
  const layout = useShellLayout();

  return (
    <Show when={!layout.isPortrait}>
      <ShellSidebarInner side="right" widthClass={props.widthClass}>
        {content()}
      </ShellSidebarInner>
    </Show>
  );
}
AppShellRight.displayName = "AppShell.Right";

function AppShellMain(props: { children?: JSX.Element }) {
  return (
    <main
      class={cn("relative flex min-h-0 min-w-0 flex-1 flex-col overflow-clip", shellSheetSurface)}
      id="main-content"
    >
      {props.children}
      <ShellPortraitPanelControls placement="top" />
    </main>
  );
}
AppShellMain.displayName = "AppShell.Main";

/**
 * Full-sheet document scrolling with a separately constrained content measure.
 *
 * `Main` stays clipped so portrait controls remain fixed; this direct child owns the
 * scrollbar at the sheet edge.
 */
function AppShellMainScroll(props: {
  children?: JSX.Element;
  class?: string;
  contentClass?: string;
}) {
  return (
    <div
      class={cn(
        "flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto",
        props.class,
      )}
      data-slot="app-shell-main-scroll"
    >
      <div
        class={cn("mx-auto flex min-h-full w-full min-w-0 shrink-0 flex-col", props.contentClass)}
        data-slot="app-shell-main-scroll-content"
      >
        {props.children}
      </div>
    </div>
  );
}
AppShellMainScroll.displayName = "AppShell.MainScroll";

function AppShellDock(props: { children?: JSX.Element; class?: string }) {
  return <ShellDockInner class={props.class}>{props.children}</ShellDockInner>;
}
AppShellDock.displayName = "AppShell.Dock";

export type AppShellCompound = typeof AppShellRoot & {
  TopBar: typeof AppShellTopBar;
  Body: typeof AppShellBody;
  MainColumn: typeof AppShellMainColumn;
  Left: typeof AppShellLeft;
  Main: typeof AppShellMain;
  MainScroll: typeof AppShellMainScroll;
  Dock: typeof AppShellDock;
  Right: typeof AppShellRight;
};

/**
 * Full-viewport instrument layout: muted stage surround, 16px gutters, floating paper
 * main sheet, 256px rails, and a 56px `TopBar`.
 *
 * Structure:
 * - `Body` — `flex-1` row containing optional `Left`, `MainColumn`, optional `Right`
 * - `MainColumn` — `TopBar`, `Main` (grows), optional `Dock`
 *
 * In portrait, or when the stage cannot preserve a usable center workspace, left/right panels
 * collapse and open as overlays above main.
 *
 * Wrap the app in `ShellThemeProvider` so `dark:` Tailwind utilities work.
 *
 * @example
 * ```tsx
 * <AppShell>
 *   <AppShell.Body>
 *     <AppShell.Left><Nav /></AppShell.Left>
 *     <AppShell.MainColumn>
 *       <AppShell.TopBar><Chrome /></AppShell.TopBar>
 *       <AppShell.Main><Editor /></AppShell.Main>
 *     </AppShell.MainColumn>
 *     <AppShell.Right><Inspector /></AppShell.Right>
 *   </AppShell.Body>
 * </AppShell>
 * ```
 */
export const AppShell: AppShellCompound = Object.assign(AppShellRoot, {
  TopBar: AppShellTopBar,
  Body: AppShellBody,
  MainColumn: AppShellMainColumn,
  Left: AppShellLeft,
  Main: AppShellMain,
  MainScroll: AppShellMainScroll,
  Dock: AppShellDock,
  Right: AppShellRight,
});

export { useShellLayout } from "./shell-layout-context";
export { ShellPanelToggle } from "./shell-portrait-panels";

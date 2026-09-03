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
/** 18px radius (`rounded-2xl` via `--radius-2xl`) and one restrained sheet elevation. */
const shellSheetSurface =
  "rounded-2xl bg-background shadow-[0_8px_24px_#0000000c] ring-1 ring-foreground/5";

/** Fixed-height header strip (`h-16`); scrolls inside if content overflows. */
const shellHeaderFixed = "flex h-16 shrink-0 flex-col overflow-hidden";

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

function AppShellRoot(props: {
  children?: JSX.Element;
  /** Ignored. AppShell is the paper-pane instrument shell. */
  variant?: string;
}) {
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

/** App header chrome (`h-16`). Renders a `<header>`. */
function AppShellHeader(props: { children?: JSX.Element }) {
  return (
    <header
      class={`${shellHeaderFixed} border-b ${shellDivider} ${shellSurface}`}
      aria-label="Application header"
    >
      <div class="min-h-0 flex-1 overflow-auto">{props.children}</div>
    </header>
  );
}
AppShellHeader.displayName = "AppShell.Header";

/** Floating header surface. Place it inside `MainColumn`. */
function AppShellTopBar(props: { children?: JSX.Element; class?: string }) {
  return (
    <div
      class={cn(
        "flex h-14 w-full shrink-0 flex-col overflow-visible px-5",
        shellSheetSurface,
        props.class,
      )}
      data-slot="app-shell-top-bar"
    >
      <div class="min-h-0 flex-1 overflow-auto rounded-[inherit]">{props.children}</div>
    </div>
  );
}
AppShellTopBar.displayName = "AppShell.TopBar";

/**
 * Horizontal band under the header: left rail, main column (main + optional dock), right rail.
 * Use `flex-1` so it fills remaining height when a `Header` is present.
 */
function AppShellBody(props: { children?: JSX.Element }) {
  const layout = useShellLayout();

  return (
    <div
      class={cn(
        "relative flex min-h-0 flex-1 overflow-visible bg-muted",
        layout.isPortrait && "px-4",
      )}
    >
      {props.children}
      <ShellPortraitPanelOverlays />
    </div>
  );
}
AppShellBody.displayName = "AppShell.Body";

/** Center stack: scrollable `Main` plus optional fixed-height `Dock`. */
function AppShellMainColumn(props: { children?: JSX.Element }) {
  return (
    <div class="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-visible bg-muted">
      {props.children}
    </div>
  );
}
AppShellMainColumn.displayName = "AppShell.MainColumn";

function AppShellLeft(props: {
  children?: JSX.Element;
  /** Tailwind width utility; defaults to `w-64`. */
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
  /** Tailwind width utility; defaults to `w-64`. */
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
      class={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-visible",
        shellSheetSurface,
      )}
      id="main-content"
    >
      <div
        class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-clip rounded-[inherit]"
        data-slot="app-shell-main-clip"
      >
        {props.children}
        <ShellPortraitPanelControls placement="top" />
      </div>
    </main>
  );
}
AppShellMain.displayName = "AppShell.Main";

/**
 * Full-sheet document scrolling with a separately constrained content measure.
 *
 * `Main` keeps overflow visible so the sheet elevation can paint onto the rails; an inner clip
 * holds portrait controls fixed. This child owns the scrollbar at the sheet edge.
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
  Header: typeof AppShellHeader;
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
 * Full-viewport paper-pane instrument shell: **explicit composition** (no slot parsing).
 *
 * Structure:
 * - `TopBar` — floating header; place it inside `MainColumn`
 * - `Body` — `flex-1` row containing optional `Left`, `MainColumn`, optional `Right`
 * - `MainColumn` — `Main` (grows, scrolls) and optional `Dock` (fixed-height strip)
 *
 * In portrait, or when the shell cannot preserve a usable center workspace, left/right panels
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
 *       <AppShell.TopBar><Header /></AppShell.TopBar>
 *       <AppShell.Main><Editor /></AppShell.Main>
 *     </AppShell.MainColumn>
 *     <AppShell.Right><Inspector /></AppShell.Right>
 *   </AppShell.Body>
 * </AppShell>
 * ```
 */
export const AppShell: AppShellCompound = Object.assign(AppShellRoot, {
  Header: AppShellHeader,
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

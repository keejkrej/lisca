import type { ReactNode } from "react";
import { useEffect, useId } from "react";

import { cn } from "../../lib/utils";
import { ShellLayoutProvider, useShellLayout } from "./shell-layout-context";
import { ShellPortraitPanelControls, ShellPortraitPanelOverlays } from "./shell-portrait-panels";

const shellDivider = "border-border";
const shellSurface = "bg-background";

/** Fixed-height header strip (`h-16`); scrolls inside if content overflows. */
const shellHeaderFixed = "flex h-16 shrink-0 flex-col overflow-hidden";

/** Fixed-height dock strip (`11rem`); scrolls inside if content overflows. */
const shellDockFixed = "flex h-[11rem] shrink-0 flex-col overflow-hidden";

function ShellDockInner(props: { children?: ReactNode; className?: string }) {
  return (
    <div
      role="region"
      aria-label="Dock"
      className={cn(shellDockFixed, "border-t", shellDivider, shellSurface, props.className)}
    >
      <div className="min-h-0 flex-1 overflow-auto">{props.children}</div>
    </div>
  );
}

function ShellSidebarInner(props: {
  side: "left" | "right";
  children?: ReactNode;
  widthClass?: string;
}) {
  const edge = props.side === "left" ? `border-r ${shellDivider}` : `border-l ${shellDivider}`;
  return (
    <aside
      aria-label={props.side === "left" ? "Left panel" : "Right panel"}
      className={`flex min-h-0 shrink-0 flex-col overflow-y-auto ${shellSurface} ${props.widthClass ?? "w-56"} ${edge}`}
    >
      {props.children}
    </aside>
  );
}

function useRegisterShellPanel(props: {
  side: "left" | "right";
  children?: ReactNode;
  widthClass?: string;
}) {
  const layout = useShellLayout();
  const id = useId();
  const widthClass = props.widthClass ?? "w-56";

  useEffect(() => {
    if (!layout.isPortrait) {
      return undefined;
    }
    const register = props.side === "left" ? layout.registerLeftPanel : layout.registerRightPanel;
    return register({
      id,
      widthClass,
      content: props.children,
    });
  }, [
    id,
    layout.isPortrait,
    layout.registerLeftPanel,
    layout.registerRightPanel,
    props.children,
    props.side,
    widthClass,
  ]);
}

function SkipToMainLink() {
  return (
    <a
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      href="#main-content"
    >
      Skip to main content
    </a>
  );
}

function AppShellRoot(props: { children?: ReactNode }) {
  return (
    <ShellLayoutProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <SkipToMainLink />
        {props.children}
      </div>
    </ShellLayoutProvider>
  );
}
AppShellRoot.displayName = "AppShell";

/** App header chrome (`h-16`). Renders a `<header>`. */
function AppShellHeader(props: { children?: ReactNode }) {
  return (
    <header
      className={`${shellHeaderFixed} border-b ${shellDivider} ${shellSurface}`}
      aria-label="Application header"
    >
      <div className="min-h-0 flex-1 overflow-auto">{props.children}</div>
    </header>
  );
}
AppShellHeader.displayName = "AppShell.Header";

/**
 * Horizontal band under the header: left rail, main column (main + optional dock), right rail.
 * Use `flex-1` so it fills remaining height when a `Header` is present.
 */
function AppShellBody(props: { children?: ReactNode }) {
  return (
    <div className={`relative flex min-h-0 flex-1 overflow-hidden ${shellSurface}`}>
      {props.children}
      <ShellPortraitPanelOverlays />
    </div>
  );
}
AppShellBody.displayName = "AppShell.Body";

/** Center stack: scrollable `Main` plus optional fixed-height `Dock`. */
function AppShellMainColumn(props: { children?: ReactNode }) {
  return (
    <div className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${shellSurface}`}>
      {props.children}
    </div>
  );
}
AppShellMainColumn.displayName = "AppShell.MainColumn";

function AppShellLeft(props: {
  children?: ReactNode;
  /** Tailwind width utility; default `w-56`. */
  widthClass?: string;
}) {
  useRegisterShellPanel({ side: "left", children: props.children, widthClass: props.widthClass });
  const layout = useShellLayout();

  if (layout.isPortrait) {
    return null;
  }

  return (
    <ShellSidebarInner side="left" widthClass={props.widthClass}>
      {props.children}
    </ShellSidebarInner>
  );
}
AppShellLeft.displayName = "AppShell.Left";

function AppShellRight(props: {
  children?: ReactNode;
  /** Tailwind width utility; default `w-56`. */
  widthClass?: string;
}) {
  useRegisterShellPanel({ side: "right", children: props.children, widthClass: props.widthClass });
  const layout = useShellLayout();

  if (layout.isPortrait) {
    return null;
  }

  return (
    <ShellSidebarInner side="right" widthClass={props.widthClass}>
      {props.children}
    </ShellSidebarInner>
  );
}
AppShellRight.displayName = "AppShell.Right";

function AppShellMain(props: { children?: ReactNode }) {
  return (
    <main className={`relative min-h-0 flex-1 overflow-auto ${shellSurface}`} id="main-content">
      {props.children}
      <ShellPortraitPanelControls />
    </main>
  );
}
AppShellMain.displayName = "AppShell.Main";

function AppShellDock(props: { children?: ReactNode; className?: string }) {
  return <ShellDockInner className={props.className}>{props.children}</ShellDockInner>;
}
AppShellDock.displayName = "AppShell.Dock";

export type AppShellCompound = typeof AppShellRoot & {
  Header: typeof AppShellHeader;
  Body: typeof AppShellBody;
  MainColumn: typeof AppShellMainColumn;
  Left: typeof AppShellLeft;
  Main: typeof AppShellMain;
  Dock: typeof AppShellDock;
  Right: typeof AppShellRight;
};

/**
 * Full-viewport app layout: **explicit composition** (no slot parsing).
 *
 * Structure:
 * - `Header` — fixed-height header strip
 * - `Body` — `flex-1` row containing optional `Left`, `MainColumn`, optional `Right`
 * - `MainColumn` — `Main` (grows, scrolls) and optional `Dock` (fixed-height strip)
 *
 * In portrait (taller than wide), left/right panels collapse and open as overlays above main.
 *
 * Wrap the app in `ShellThemeProvider` so `dark:` Tailwind utilities work.
 *
 * @example
 * ```tsx
 * <AppShell>
 *   <AppShell.Header><Header /></AppShell.Header>
 *   <AppShell.Body>
 *     <AppShell.Left><Nav /></AppShell.Left>
 *     <AppShell.MainColumn>
 *       <AppShell.Main><Editor /></AppShell.Main>
 *       <AppShell.Dock><Logs /></AppShell.Dock>
 *     </AppShell.MainColumn>
 *     <AppShell.Right><Inspector /></AppShell.Right>
 *   </AppShell.Body>
 * </AppShell>
 * ```
 */
export const AppShell: AppShellCompound = Object.assign(AppShellRoot, {
  Header: AppShellHeader,
  Body: AppShellBody,
  MainColumn: AppShellMainColumn,
  Left: AppShellLeft,
  Main: AppShellMain,
  Dock: AppShellDock,
  Right: AppShellRight,
});

/** Stand-alone dock strip (same fixed height as `AppShell.Dock`). */
export function ShellDock(props: { children?: ReactNode; className?: string }) {
  return <ShellDockInner className={props.className}>{props.children}</ShellDockInner>;
}

/** Stand-alone sidebar (same fixed width as `AppShell.Left` / `AppShell.Right`). */
export function ShellSidebar(props: {
  side: "left" | "right";
  children?: ReactNode;
  /** Tailwind width utility; default `w-56`. */
  widthClass?: string;
}) {
  return (
    <ShellSidebarInner side={props.side} widthClass={props.widthClass}>
      {props.children}
    </ShellSidebarInner>
  );
}

export { useShellLayout } from "./shell-layout-context";
export { ShellPanelToggle } from "./shell-portrait-panels";

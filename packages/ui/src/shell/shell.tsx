import type { ReactNode } from "react";

const shellDivider = "border-border";

/** Fixed-height header strip (`h-16`); scrolls inside if content overflows. */
const shellHeaderFixed = "flex h-16 shrink-0 flex-col overflow-hidden";

/** Fixed-height dock strip (`11rem`); scrolls inside if content overflows. */
const shellDockFixed = "flex h-[11rem] shrink-0 flex-col overflow-hidden";

function ShellDockInner(props: { children?: ReactNode }) {
  return (
    <div role="region" aria-label="Dock" className={`${shellDockFixed} border-t ${shellDivider}`}>
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
      className={`flex min-h-0 shrink-0 flex-col overflow-y-auto ${props.widthClass ?? "w-56"} ${edge}`}
    >
      {props.children}
    </aside>
  );
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <SkipToMainLink />
      {props.children}
    </div>
  );
}
AppShellRoot.displayName = "AppShell";

/** App header chrome (`h-16`). Renders a `<header>`. */
function AppShellHeader(props: { children?: ReactNode }) {
  return (
    <header
      className={`${shellHeaderFixed} border-b ${shellDivider}`}
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
  return <div className="flex min-h-0 flex-1 overflow-hidden">{props.children}</div>;
}
AppShellBody.displayName = "AppShell.Body";

/** Center stack: scrollable `Main` plus optional fixed-height `Dock`. */
function AppShellMainColumn(props: { children?: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{props.children}</div>
  );
}
AppShellMainColumn.displayName = "AppShell.MainColumn";

function AppShellLeft(props: {
  children?: ReactNode;
  /** Tailwind width utility; default `w-56`. */
  widthClass?: string;
}) {
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
  return (
    <ShellSidebarInner side="right" widthClass={props.widthClass}>
      {props.children}
    </ShellSidebarInner>
  );
}
AppShellRight.displayName = "AppShell.Right";

function AppShellMain(props: { children?: ReactNode }) {
  return (
    <main className="min-h-0 flex-1 overflow-auto" id="main-content">
      {props.children}
    </main>
  );
}
AppShellMain.displayName = "AppShell.Main";

function AppShellDock(props: { children?: ReactNode }) {
  return <ShellDockInner>{props.children}</ShellDockInner>;
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
export function ShellDock(props: { children?: ReactNode }) {
  return <ShellDockInner>{props.children}</ShellDockInner>;
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

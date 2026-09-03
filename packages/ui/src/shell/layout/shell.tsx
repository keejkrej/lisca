import {
  children as resolveChildren,
  createContext,
  createEffect,
  createUniqueId,
  onCleanup,
  Show,
  useContext,
  type JSX,
} from "solid-js";

import { cn } from "../../lib/utils";
import { ShellLayoutProvider, useShellLayout } from "./shell-layout-context";
import { ShellPortraitPanelControls, ShellPortraitPanelOverlays } from "./shell-portrait-panels";

const shellDivider = "border-border";
const shellSurface = "bg-background";
/** 18px radius (`rounded-2xl` via `--radius-2xl`) and a wide, low-contrast elevation. */
const shellStageSurface =
  "rounded-2xl bg-background shadow-[0_8px_40px_#0000000c,0_20px_56px_#0000000a]";

export type AppShellVariant = "default" | "stage";

const AppShellVariantContext = createContext<AppShellVariant>("default");

function useAppShellVariant(): AppShellVariant {
  return useContext(AppShellVariantContext);
}

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
  const variant = useAppShellVariant();
  const edge = props.side === "left" ? `border-r ${shellDivider}` : `border-l ${shellDivider}`;
  const widthClass = () => props.widthClass ?? (variant === "stage" ? "w-64" : "w-56");
  return (
    <aside
      aria-label={props.side === "left" ? "Left panel" : "Right panel"}
      class={cn(
        "flex min-h-0 shrink-0 flex-col",
        widthClass(),
        variant === "stage"
          ? "h-full overflow-hidden bg-muted"
          : `overflow-y-auto ${shellSurface} ${edge}`,
      )}
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
  const variant = useAppShellVariant();
  const id = createUniqueId();
  const widthClass = () => props.widthClass ?? (variant === "stage" ? "w-64" : "w-56");

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

function AppShellRoot(props: { children?: JSX.Element; variant?: AppShellVariant }) {
  const variant = () => props.variant ?? "default";

  return (
    <AppShellVariantContext.Provider value={variant()}>
      <ShellLayoutProvider layout={variant()}>
        <div
          class={
            variant() === "stage"
              ? "lisca-instrument-shell flex h-full min-h-0 flex-col overflow-clip bg-muted py-4 text-xs leading-4 text-foreground"
              : "flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground"
          }
          data-variant={variant()}
        >
          <SkipToMainLink />
          {props.children}
        </div>
      </ShellLayoutProvider>
    </AppShellVariantContext.Provider>
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

/** Floating header surface for the `stage` composition. Place it inside `MainColumn`. */
function AppShellTopBar(props: { children?: JSX.Element; class?: string }) {
  return (
    <div
      class={cn(
        "flex h-14 w-full shrink-0 flex-col overflow-visible px-5",
        shellStageSurface,
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
  const variant = useAppShellVariant();
  const layout = useShellLayout();

  return (
    <div
      class={cn(
        "relative flex min-h-0 flex-1",
        variant === "stage" ? "overflow-visible bg-muted" : `overflow-hidden ${shellSurface}`,
        variant === "stage" && layout.isPortrait && "px-4",
      )}
    >
      {props.children}
      <ShellPortraitPanelOverlays appearance={variant} />
    </div>
  );
}
AppShellBody.displayName = "AppShell.Body";

/** Center stack: scrollable `Main` plus optional fixed-height `Dock`. */
function AppShellMainColumn(props: { children?: JSX.Element }) {
  const variant = useAppShellVariant();

  return (
    <div
      class={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        variant === "stage"
          ? "relative z-10 gap-3 overflow-visible bg-muted"
          : `overflow-hidden ${shellSurface}`,
      )}
    >
      {props.children}
    </div>
  );
}
AppShellMainColumn.displayName = "AppShell.MainColumn";

function AppShellLeft(props: {
  children?: JSX.Element;
  /** Tailwind width utility; defaults to `w-56`, or `w-64` in the stage variant. */
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
  /** Tailwind width utility; defaults to `w-56`, or `w-64` in the stage variant. */
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
  const variant = useAppShellVariant();
  const stage = variant === "stage";

  return (
    <main
      class={cn(
        "relative min-h-0 flex-1",
        stage
          ? cn("flex min-w-0 flex-col overflow-visible", shellStageSurface)
          : `overflow-auto ${shellSurface}`,
      )}
      id="main-content"
    >
      <div
        class={
          stage
            ? "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-clip rounded-[inherit]"
            : "contents"
        }
        data-slot={stage ? "app-shell-main-clip" : undefined}
      >
        {props.children}
        <ShellPortraitPanelControls placement={stage ? "top" : "center"} />
      </div>
    </main>
  );
}
AppShellMain.displayName = "AppShell.Main";

/**
 * Full-sheet document scrolling with a separately constrained content measure.
 *
 * Stage `Main` keeps overflow visible so the sheet elevation can paint onto the rails; an inner
 * clip holds portrait controls fixed. This child owns the scrollbar at the sheet edge. Classic
 * `Main` already owns scrolling, so the same interface contributes document flow without creating
 * a nested scroll viewport.
 */
function AppShellMainScroll(props: {
  children?: JSX.Element;
  class?: string;
  contentClass?: string;
}) {
  const variant = useAppShellVariant();

  return (
    <div
      class={cn(
        "flex min-w-0 w-full flex-1 flex-col",
        variant === "stage"
          ? "h-full min-h-0 overflow-x-hidden overflow-y-auto"
          : "min-h-full overflow-visible",
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
 * Full-viewport app layout: **explicit composition** (no slot parsing).
 *
 * Structure:
 * - `Header` — classic fixed-height header strip
 * - `TopBar` — floating stage header; place it inside `MainColumn`
 * - `Body` — `flex-1` row containing optional `Left`, `MainColumn`, optional `Right`
 * - `MainColumn` — `Main` (grows, scrolls) and optional `Dock` (fixed-height strip)
 *
 * In portrait, or when the stage cannot preserve a usable center workspace, left/right panels
 * collapse and open as overlays above main.
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

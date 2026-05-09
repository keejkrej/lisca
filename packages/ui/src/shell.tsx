import {
  Children,
  Fragment,
  isValidElement,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";

type AppShellSlots = {
  top?: ReactNode;
  left?: ReactNode;
  main?: ReactNode;
  bottom?: ReactNode;
  right?: ReactNode;
};

type SlotMarkerProps = { children?: ReactNode };

function flattenSlotElements(nodes: ReactNode): ReactElement<SlotMarkerProps>[] {
  const out: ReactElement<SlotMarkerProps>[] = [];
  Children.forEach(nodes, (child) => {
    if (!isValidElement<SlotMarkerProps>(child)) return;
    if (child.type === Fragment) {
      out.push(...flattenSlotElements(child.props.children));
      return;
    }
    out.push(child);
  });
  return out;
}

function AppShellTop(_props: SlotMarkerProps) {
  return null;
}
AppShellTop.displayName = "AppShell.Top";

function AppShellLeft(_props: SlotMarkerProps) {
  return null;
}
AppShellLeft.displayName = "AppShell.Left";

function AppShellMain(_props: SlotMarkerProps) {
  return null;
}
AppShellMain.displayName = "AppShell.Main";

function AppShellBottom(_props: SlotMarkerProps) {
  return null;
}
AppShellBottom.displayName = "AppShell.Bottom";

function AppShellRight(_props: SlotMarkerProps) {
  return null;
}
AppShellRight.displayName = "AppShell.Right";

function collectAppShellSlots(children: ReactNode): AppShellSlots {
  const slots: AppShellSlots = {};
  for (const child of flattenSlotElements(children)) {
    const body = child.props.children;
    switch (child.type) {
      case AppShellTop:
        slots.top = body;
        break;
      case AppShellLeft:
        slots.left = body;
        break;
      case AppShellMain:
        slots.main = body;
        break;
      case AppShellBottom:
        slots.bottom = body;
        break;
      case AppShellRight:
        slots.right = body;
        break;
      default:
        break;
    }
  }
  return slots;
}

const shellDivider = "border-border";

/** Fixed-height top strip (`h-16`); scrolls inside if content overflows. */
const shellTopFixed = "flex h-16 shrink-0 flex-col overflow-hidden";

/** Fixed-height bottom strip (`calc(13rem × 2/3)`); scrolls inside if content overflows. */
const shellBottomFixed = "flex h-[calc(13rem*2/3)] shrink-0 flex-col overflow-hidden";

function ShellBottomInner(props: { children?: ReactNode }) {
  return (
    <div
      role="region"
      aria-label="Bottom panel"
      className={`${shellBottomFixed} border-t ${shellDivider}`}
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
      className={`flex min-h-0 shrink-0 flex-col overflow-y-auto ${props.widthClass ?? "w-56"} ${edge}`}
    >
      {props.children}
    </aside>
  );
}

function AppShellRoot(props: { children?: ReactNode }) {
  const slots = useMemo(() => collectAppShellSlots(props.children), [props.children]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      {slots.top != null ? (
        <div
          className={`${shellTopFixed} border-b ${shellDivider}`}
          role="region"
          aria-label="Top bar"
        >
          <div className="min-h-0 flex-1 overflow-auto">{slots.top}</div>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {slots.left != null ? (
          <ShellSidebarInner side="left">{slots.left}</ShellSidebarInner>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <main className="min-h-0 flex-1 overflow-auto">{slots.main}</main>
          {slots.bottom != null ? <ShellBottomInner>{slots.bottom}</ShellBottomInner> : null}
        </div>
        {slots.right != null ? (
          <ShellSidebarInner side="right">{slots.right}</ShellSidebarInner>
        ) : null}
      </div>
    </div>
  );
}
AppShellRoot.displayName = "AppShell";

export type AppShellCompound = typeof AppShellRoot & {
  Top: typeof AppShellTop;
  Left: typeof AppShellLeft;
  Main: typeof AppShellMain;
  Bottom: typeof AppShellBottom;
  Right: typeof AppShellRight;
};

/**
 * Layout: **fixed** top (`h-16`) and bottom (`calc(13rem × 2/3)`),
 * **fixed** left/right width (`w-56` by default); **main** grows and scrolls.
 * Top/bottom slots scroll inside their strip if content overflows.
 * Wrap the app (or router) in `ShellThemeProvider` so `dark:` Tailwind utilities work.
 *
 * @example
 * ```tsx
 * <AppShell>
 *   <AppShell.Top><Header /></AppShell.Top>
 *   <AppShell.Left><Nav /></AppShell.Left>
 *   <AppShell.Main><Editor /></AppShell.Main>
 *   <AppShell.Bottom><Logs /></AppShell.Bottom>
 *   <AppShell.Right><Inspector /></AppShell.Right>
 * </AppShell>
 * ```
 */
export const AppShell: AppShellCompound = Object.assign(AppShellRoot, {
  Top: AppShellTop,
  Left: AppShellLeft,
  Main: AppShellMain,
  Bottom: AppShellBottom,
  Right: AppShellRight,
});

/** Stand-alone bottom strip (same fixed height as `AppShell.Bottom`). */
export function ShellBottom(props: { children?: ReactNode }) {
  return <ShellBottomInner>{props.children}</ShellBottomInner>;
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

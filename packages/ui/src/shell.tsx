import type { HelloMessage } from "@lisca/contracts";
import { WS_PATH } from "@lisca/contracts";
import { resolveLiscaWsUrl } from "@lisca/utils";
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
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

const shellDivider = "border-neutral-300 dark:border-neutral-700";

/**
 * Layout model: fixed-height top/bottom strips, fixed-width left/right columns (`w-56` by default),
 * main fills the rest. Top/bottom content scrolls inside the strip if it overflows.
 */
const shellTopFixed = "flex h-16 shrink-0 flex-col overflow-hidden";
const shellBottomFixed = "flex h-[calc(13rem*2/3)] shrink-0 flex-col overflow-hidden";

/** Bottom slot: fixed height; inherits shell fg/bg from `AppShell` root. */
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

/** Sidebar: fixed width (`w-56` unless overridden), full row height, vertical scroll. */
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
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
 * Layout: **fixed** top (`h-16`, half of the prior `h-32` strip) and bottom (`calc(13rem × 2/3)`),
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

/** Title row; inherits shell colors from parent. */
export function ShellTitleHeader(props: { title: string }) {
  return (
    <header className="shrink-0 px-6 py-3">
      <h1 className="text-lg font-semibold">{props.title}</h1>
    </header>
  );
}

export function ShellHeaderBar(props: { start: ReactNode; center: ReactNode; end: ReactNode }) {
  return (
    <header className="shrink-0 px-6 py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="min-w-0 justify-self-start">{props.start}</div>
        <div className="min-w-0 justify-self-center">{props.center}</div>
        <div className="min-w-0 justify-self-end">{props.end}</div>
      </div>
    </header>
  );
}

export function ShellFolderIcon(props: { className?: string }) {
  return (
    <svg className={props.className ?? "size-4"} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShellDriveIcon(props: { className?: string }) {
  return (
    <svg className={props.className ?? "size-4"} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 15h4M15 15h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ShellPathChip(props: {
  label: string;
  value: string | null;
  icon: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const disabled = props.disabled ?? !props.onClick;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={props.onClick}
      className="flex max-w-[min(100%,18rem)] items-center gap-2 rounded-md border border-current/25 px-3 py-1.5 text-left text-sm disabled:cursor-default disabled:opacity-50"
    >
      <span className="shrink-0 opacity-60">{props.icon}</span>
      <span className="min-w-0">
        <span className="block text-[0.65rem] font-medium uppercase tracking-wide opacity-60">
          {props.label}
        </span>
        <span className="block truncate font-mono text-xs">{props.value ?? "—"}</span>
      </span>
    </button>
  );
}

export type ShellConnectionState = "idle" | "connecting" | "open" | "closed";

export function ShellConnectionStatus(props: {
  wsUrl: string;
  state: ShellConnectionState;
  /** Defaults to `"Server"`. */
  label?: string;
}) {
  const title = props.label ?? "Server";
  const statusLabel =
    props.state === "open"
      ? "Connected"
      : props.state === "connecting"
        ? "Connecting…"
        : props.state === "closed"
          ? "Disconnected"
          : "Idle";

  const dot =
    props.state === "open"
      ? "bg-emerald-500"
      : props.state === "connecting"
        ? "bg-amber-400"
        : "bg-neutral-300 dark:bg-neutral-600";

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-current/25 px-3 py-1.5 text-xs"
      title={props.wsUrl}
    >
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="font-medium">{title}</span>
      <span className="opacity-70">{statusLabel}</span>
    </div>
  );
}

export type ShellSegmentOption<T extends string> = { value: T; label: string };

export function ShellSegmentedControl<T extends string>(props: {
  value: T;
  onChange: (value: T) => void;
  options: readonly ShellSegmentOption<T>[];
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const item = (value: T, _label: string): ButtonHTMLAttributes<HTMLButtonElement> => ({
    type: "button",
    role: "radio",
    "aria-checked": props.value === value,
    disabled: props.disabled,
    onClick: () => props.onChange(value),
    className: [
      "min-w-[4.5rem] rounded px-3 py-1.5 text-sm",
      props.value === value
        ? "font-semibold underline underline-offset-2"
        : "opacity-70 hover:opacity-100",
    ].join(" "),
  });

  return (
    <div
      className="inline-flex gap-1"
      role="radiogroup"
      aria-label={props["aria-label"] ?? "Segmented control"}
    >
      {props.options.map((opt) => (
        <button key={opt.value} {...item(opt.value, opt.label)}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export type ShellWsProbe = {
  wsUrl: string;
  state: ShellConnectionState;
  log: string[];
};

export function useShellWsProbe(options: { defaultPort: number }): ShellWsProbe {
  const wsUrl = useMemo(() => {
    const params =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    return resolveLiscaWsUrl({
      searchParams: params,
      viteWsUrl: import.meta.env.VITE_WS_URL,
      viteWsHost: import.meta.env.VITE_WS_HOST,
      viteWsPort: import.meta.env.VITE_WS_PORT,
      defaultPort: options.defaultPort,
      wsPath: WS_PATH,
    });
  }, [options.defaultPort]);

  const [state, setState] = useState<ShellConnectionState>("idle");
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    setState("connecting");
    const ws = new WebSocket(wsUrl);

    ws.addEventListener("open", () => {
      setState("open");
      setLog((lines) => [...lines, `connected ${wsUrl}`]);
    });

    ws.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as HelloMessage | { echo?: string };
        setLog((lines) => [...lines, JSON.stringify(data)]);
      } catch {
        setLog((lines) => [...lines, String(ev.data)]);
      }
    });

    ws.addEventListener("close", () => {
      setState("closed");
      setLog((lines) => [...lines, "socket closed"]);
    });

    return () => ws.close();
  }, [wsUrl]);

  return { wsUrl, state, log };
}

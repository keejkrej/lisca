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

function AppShellTop(props: SlotMarkerProps) {
  return null;
}
AppShellTop.displayName = "AppShell.Top";

function AppShellLeft(props: SlotMarkerProps) {
  return null;
}
AppShellLeft.displayName = "AppShell.Left";

function AppShellMain(props: SlotMarkerProps) {
  return null;
}
AppShellMain.displayName = "AppShell.Main";

function AppShellBottom(props: SlotMarkerProps) {
  return null;
}
AppShellBottom.displayName = "AppShell.Bottom";

function AppShellRight(props: SlotMarkerProps) {
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

/** Bottom panel (VS Code terminal–sized); shares styling with sidebars. */
function ShellBottomInner(props: { children?: ReactNode }) {
  return (
    <div
      role="region"
      aria-label="Bottom panel"
      className="flex h-[min(38vh,28rem)] min-h-[12rem] max-h-[min(55vh,32rem)] shrink-0 flex-col overflow-hidden border-t border-neutral-200 bg-neutral-50 text-neutral-900"
    >
      <div className="min-h-0 flex-1 overflow-auto p-3 text-xs leading-relaxed text-neutral-900">
        {props.children}
      </div>
    </div>
  );
}

/** Sidebar column chrome used inside `AppShell`. */
function ShellSidebarInner(props: {
  side: "left" | "right";
  children?: ReactNode;
  widthClass?: string;
}) {
  const edge = props.side === "left" ? "border-r" : "border-l";
  return (
    <aside
      className={`flex min-h-0 shrink-0 flex-col overflow-y-auto border-neutral-200 bg-neutral-50 ${props.widthClass ?? "w-56"} ${edge}`}
    >
      <div className="min-h-0 flex-1 p-3">{props.children}</div>
    </aside>
  );
}

function AppShellRoot(props: { children?: ReactNode }) {
  const slots = useMemo(() => collectAppShellSlots(props.children), [props.children]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-neutral-900">
      {slots.top != null ? <div className="shrink-0">{slots.top}</div> : null}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {slots.left != null ? <ShellSidebarInner side="left">{slots.left}</ShellSidebarInner> : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <main className="min-h-0 flex-1 overflow-auto">{slots.main}</main>
          {slots.bottom != null ? (
            <ShellBottomInner>{slots.bottom}</ShellBottomInner>
          ) : null}
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
 * Layout shell: nest `AppShell.Top`, `AppShell.Left`, `AppShell.Main`, `AppShell.Bottom`,
 * and `AppShell.Right`. Sidebars and bottom-panel chrome are applied for you.
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

/** Stand-alone bottom panel chrome (same as `AppShell.Bottom` content wrapper). */
export function ShellBottom(props: { children?: ReactNode }) {
  return <ShellBottomInner>{props.children}</ShellBottomInner>;
}

/** Stand-alone sidebar chrome (same as `AppShell.Left` / `AppShell.Right` wrappers). */
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

/** Lightweight header for apps that only need a title row. */
export function ShellTitleHeader(props: { title: string }) {
  return (
    <header className="shrink-0 border-b border-neutral-200 bg-white px-6 py-3">
      <h1 className="text-lg font-semibold text-neutral-900">{props.title}</h1>
    </header>
  );
}

export function ShellHeaderBar(props: {
  start: ReactNode;
  center: ReactNode;
  end: ReactNode;
}) {
  return (
    <header className="shrink-0 border-b border-neutral-200 bg-white px-6 py-3">
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
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
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
      className="flex max-w-[min(100%,18rem)] items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-left text-sm transition-colors hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50"
    >
      <span className="shrink-0 text-neutral-500">{props.icon}</span>
      <span className="min-w-0">
        <span className="block text-[0.65rem] font-medium uppercase tracking-wide text-neutral-500">
          {props.label}
        </span>
        <span className="block truncate font-mono text-xs text-neutral-900">
          {props.value ?? "—"}
        </span>
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
        : "bg-neutral-300";

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700"
      title={props.wsUrl}
    >
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="font-medium">{title}</span>
      <span className="text-neutral-500">{statusLabel}</span>
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
  const item = (
    value: T,
    label: string,
  ): ButtonHTMLAttributes<HTMLButtonElement> => ({
    type: "button",
    role: "radio",
    "aria-checked": props.value === value,
    disabled: props.disabled,
    onClick: () => props.onChange(value),
    className: [
      "min-w-[4.5rem] rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      props.value === value
        ? "bg-white text-neutral-900 shadow-sm"
        : "text-neutral-600 hover:text-neutral-900",
    ].join(" "),
  });

  return (
    <div
      className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-0.5"
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

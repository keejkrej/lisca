import {
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  useContext,
  type JSX,
} from "solid-js";
import type { ConnectionState } from "../chrome/connection-status";

export type ShellServer = {
  state: ConnectionState;
  /** Probe the server now instead of waiting for the next scheduled check. */
  retry: () => void;
};

/**
 * Desktop builds run the backend in-process over Tauri IPC (`window.liscaDesktop`), so there is
 * no server connection to check or report. Web builds always talk HTTP to a server on their own
 * origin — in development through the Vite proxy, when deployed through the Docker nginx proxy.
 */
export function hasEmbeddedBackend(): boolean {
  return typeof window !== "undefined" && "liscaDesktop" in window;
}

const ShellServerContext = createContext<ShellServer>();

/** Fast retries while booting or after a blip; report "closed" only once this many fail (~2s). */
const GRACE_ATTEMPTS = 8;
const FAST_RETRY_MS = 250;
/** While unreachable, keep retrying in the background so the app recovers on its own. */
const CLOSED_RETRY_MS = 3_000;
/** Once connected, a light heartbeat notices a server that goes away later. */
const HEARTBEAT_MS = 15_000;

function useHostProbe(probe: () => (() => Promise<unknown>) | undefined) {
  const [state, setState] = createSignal<ConnectionState>("idle");
  let checkNow: (() => void) | undefined;

  createEffect(() => {
    const maybeRun = probe();
    if (!maybeRun) {
      checkNow = undefined;
      setState("idle");
      return;
    }
    const run = maybeRun;
    let cancelled = false;
    let inFlight = false;
    let failures = 0;
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined;

    const schedule = (ms: number) => {
      if (timer !== undefined) globalThis.clearTimeout(timer);
      timer = globalThis.setTimeout(check, ms);
    };

    function check() {
      if (cancelled || inFlight) return;
      inFlight = true;
      void run()
        .then(
          () => {
            if (cancelled) return;
            failures = 0;
            setState("open");
            schedule(HEARTBEAT_MS);
          },
          () => {
            if (cancelled) return;
            failures += 1;
            if (failures >= GRACE_ATTEMPTS) {
              setState("closed");
              schedule(CLOSED_RETRY_MS);
            } else {
              schedule(FAST_RETRY_MS);
            }
          },
        )
        .finally(() => {
          inFlight = false;
        });
    }

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", checkWhenVisible);
    checkNow = check;
    setState("connecting");
    check();

    onCleanup(() => {
      cancelled = true;
      checkNow = undefined;
      if (timer !== undefined) globalThis.clearTimeout(timer);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    });
  });

  return { state, retry: () => checkNow?.() };
}

export function ShellServerProvider(props: {
  /** Server check. Omit in tests to skip network. */
  probe?: () => Promise<unknown>;
  children?: JSX.Element;
}) {
  const probe = useHostProbe(() => (hasEmbeddedBackend() ? undefined : props.probe));
  const server: ShellServer = {
    get state() {
      return probe.state();
    },
    retry: probe.retry,
  };

  return <ShellServerContext.Provider value={server}>{props.children}</ShellServerContext.Provider>;
}

export function useShellServer(): ShellServer {
  const value = useContext(ShellServerContext);
  if (!value) {
    throw new Error("useShellServer must be used within ShellServerProvider");
  }
  return value;
}

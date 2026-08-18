import {
  readLiscaActiveServerForApp,
  resolveLiscaHttpBaseUrl,
  setLiscaActiveServerAddress,
  type LiscaAppId,
} from "@lisca/utils";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
  type JSX,
} from "solid-js";
import { createStore } from "solid-js/store";
import type { ConnectionState } from "../chrome/connection-status";

export type ShellServer = {
  httpBaseUrl: string;
  state: ConnectionState;
  defaultPort: number;
  localLabel: string;
  activeAddress: string | null;
};

type ShellServerData = ShellServer;

type ShellServerAction = {
  type: "syncRuntime";
  httpBaseUrl: string;
  localLabel: string;
  connectionState: ConnectionState;
};

const ShellServerContext = createContext<ShellServer>();

function shellServerReducer(state: ShellServerData, action: ShellServerAction): ShellServerData {
  switch (action.type) {
    case "syncRuntime":
      return {
        ...state,
        httpBaseUrl: action.httpBaseUrl,
        localLabel: action.localLabel,
        state: action.connectionState,
      };
  }
}

function readWebEnv() {
  return {
    searchParams:
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null,
    viteHttpUrl: import.meta.env.VITE_HTTP_URL,
    viteHttpHost: import.meta.env.VITE_HTTP_HOST,
    viteHttpPort: import.meta.env.VITE_HTTP_PORT,
  };
}

function httpResolveOptions(
  env: ReturnType<typeof readWebEnv>,
  defaultPort: number,
  activeAddress: string | null,
) {
  return {
    searchParams: env.searchParams,
    viteHttpUrl: env.viteHttpUrl,
    viteHttpHost: env.viteHttpHost,
    viteHttpPort: env.viteHttpPort,
    defaultPort,
    activeAddress,
  };
}

function resolveLocalLabel(defaultPort: number): string {
  const env = readWebEnv();
  const url = resolveLiscaHttpBaseUrl(httpResolveOptions(env, defaultPort, null));
  try {
    return new URL(url).host;
  } catch {
    return `127.0.0.1:${defaultPort}`;
  }
}

function createInitialServerData(defaultPort: number, appId?: LiscaAppId): ShellServerData {
  const env = readWebEnv();
  const localLabel = resolveLocalLabel(defaultPort);
  const persistedAddress = appId ? readLiscaActiveServerForApp(appId) : null;
  if (persistedAddress) {
    setLiscaActiveServerAddress(persistedAddress);
  }
  const httpBaseUrl = resolveLiscaHttpBaseUrl(
    httpResolveOptions(env, defaultPort, persistedAddress),
  );
  return {
    defaultPort,
    localLabel,
    httpBaseUrl,
    state: "idle",
    activeAddress: persistedAddress,
  };
}

const MAX_PROBE_ATTEMPTS = 40;
const PROBE_RETRY_MS = 250;

function useHostProbe(
  probe: () => (() => Promise<unknown>) | undefined,
  httpBaseUrl: () => string,
) {
  const [state, setState] = createSignal<ConnectionState>("idle");

  createEffect(() => {
    httpBaseUrl();
    const run = probe();
    if (!run) {
      setState("idle");
      return;
    }
    let cancelled = false;
    let retryTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
    let attempt = 0;
    let connected = false;

    const scheduleRetry = () => {
      if (cancelled || connected || attempt >= MAX_PROBE_ATTEMPTS) {
        if (!connected && attempt >= MAX_PROBE_ATTEMPTS) setState("closed");
        return;
      }
      retryTimer = globalThis.setTimeout(runProbe, PROBE_RETRY_MS);
    };

    const runProbe = () => {
      if (cancelled || connected) return;
      attempt += 1;
      setState("connecting");
      void run()
        .then(() => {
          if (cancelled) return;
          connected = true;
          setState("open");
        })
        .catch(() => {
          if (cancelled) return;
          scheduleRetry();
        });
    };

    setState("idle");
    runProbe();

    onCleanup(() => {
      cancelled = true;
      if (retryTimer !== undefined) globalThis.clearTimeout(retryTimer);
    });
  });

  return { state };
}

export function ShellServerProvider(props: {
  defaultPort: number;
  appId?: LiscaAppId;
  /** Host-port check. Omit in tests to skip network. */
  probe?: () => Promise<unknown>;
  children?: JSX.Element;
}) {
  const [server, setServer] = createStore<ShellServer>(
    createInitialServerData(props.defaultPort, props.appId),
  );

  const dispatch = (action: ShellServerAction) => {
    setServer(
      shellServerReducer(
        {
          httpBaseUrl: server.httpBaseUrl,
          state: server.state,
          defaultPort: server.defaultPort,
          localLabel: server.localLabel,
          activeAddress: server.activeAddress,
        },
        action,
      ),
    );
  };

  const httpBaseUrl = createMemo(() => {
    const env = readWebEnv();
    return resolveLiscaHttpBaseUrl(
      httpResolveOptions(env, props.defaultPort, server.activeAddress),
    );
  });

  const localLabel = createMemo(() => resolveLocalLabel(props.defaultPort));
  const probe = useHostProbe(
    () => props.probe,
    () => httpBaseUrl(),
  );

  createEffect(() => {
    dispatch({
      type: "syncRuntime",
      httpBaseUrl: httpBaseUrl(),
      localLabel: localLabel(),
      connectionState: probe.state(),
    });
  });

  return <ShellServerContext.Provider value={server}>{props.children}</ShellServerContext.Provider>;
}

export function useShellServer(): ShellServer {
  const value = useContext(ShellServerContext);
  if (!value) {
    throw new Error("useShellServer must be used within ShellServerProvider");
  }
  return value;
}

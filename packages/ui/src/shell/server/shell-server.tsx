import {
  addLiscaSavedServer,
  persistLiscaActiveServer,
  readLiscaActiveServerForApp,
  readLiscaSavedServers,
  removeLiscaSavedServer,
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
import { ServerAddressDialog } from "./server-address-dialog";
import type { ConnectionState } from "../chrome/connection-status";

export type ShellServer = {
  httpBaseUrl: string;
  state: ConnectionState;
  defaultPort: number;
  localLabel: string;
  activeAddress: string | null;
  savedServers: string[];
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

type ShellServerData = Omit<ShellServer, "openSettings" | "closeSettings">;

type ShellServerAction =
  | { type: "openSettings" }
  | { type: "closeSettings" }
  | { type: "setSettingsOpen"; open: boolean }
  | { type: "setSavedServers"; savedServers: string[] }
  | { type: "setActiveAddress"; activeAddress: string | null }
  | {
      type: "syncRuntime";
      httpBaseUrl: string;
      localLabel: string;
      connectionState: ConnectionState;
    };

const ShellServerContext = createContext<ShellServer>();

function shellServerReducer(state: ShellServerData, action: ShellServerAction): ShellServerData {
  switch (action.type) {
    case "openSettings":
      return { ...state, settingsOpen: true };
    case "closeSettings":
      return { ...state, settingsOpen: false };
    case "setSettingsOpen":
      return { ...state, settingsOpen: action.open };
    case "setSavedServers":
      return { ...state, savedServers: action.savedServers };
    case "setActiveAddress":
      return { ...state, activeAddress: action.activeAddress };
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
    settingsOpen: false,
    savedServers: readLiscaSavedServers(),
    activeAddress: persistedAddress,
    defaultPort,
    localLabel,
    httpBaseUrl,
    state: "idle",
  };
}

const MAX_PROBE_ATTEMPTS = 40;
const PROBE_RETRY_MS = 250;

function useHttpProbeForUrl(httpBaseUrl: () => string) {
  const [state, setState] = createSignal<ConnectionState>("idle");
  const [log, setLog] = createSignal<string[]>([]);

  createEffect(() => {
    const base = httpBaseUrl();
    let cancelled = false;
    let retryTimer: number | undefined;
    let attempt = 0;
    let connected = false;
    const controller = new AbortController();

    const scheduleRetry = () => {
      if (cancelled || connected || attempt >= MAX_PROBE_ATTEMPTS) {
        if (!connected && attempt >= MAX_PROBE_ATTEMPTS) setState("closed");
        return;
      }
      retryTimer = window.setTimeout(probe, PROBE_RETRY_MS);
    };

    const probe = () => {
      if (cancelled || connected) return;
      attempt += 1;
      setState("connecting");
      const url = `${base.replace(/\/$/, "")}/fs/home`;
      void fetch(url, { signal: controller.signal })
        .then(async (response) => {
          if (cancelled) return;
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          connected = true;
          setState("open");
          setLog((lines) => [...lines, `connected ${url}`]);
        })
        .catch((cause) => {
          if (cancelled || controller.signal.aborted) return;
          setLog((lines) => [
            ...lines,
            cause instanceof Error ? cause.message : String(cause),
          ]);
          scheduleRetry();
        });
    };

    setState("idle");
    setLog([]);
    probe();

    onCleanup(() => {
      cancelled = true;
      controller.abort();
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    });
  });

  return { state, log };
}

export function ShellServerProvider(props: {
  defaultPort: number;
  appId?: LiscaAppId;
  children?: JSX.Element;
}) {
  const [server, setServer] = createStore<ShellServer>({
    ...createInitialServerData(props.defaultPort, props.appId),
    openSettings: () => {},
    closeSettings: () => {},
  });

  const dispatch = (action: ShellServerAction) => {
    setServer(
      shellServerReducer(
        {
          httpBaseUrl: server.httpBaseUrl,
          state: server.state,
          defaultPort: server.defaultPort,
          localLabel: server.localLabel,
          activeAddress: server.activeAddress,
          savedServers: server.savedServers,
          settingsOpen: server.settingsOpen,
        },
        action,
      ),
    );
  };

  setServer({
    openSettings: () => dispatch({ type: "openSettings" }),
    closeSettings: () => dispatch({ type: "closeSettings" }),
  });

  const httpBaseUrl = createMemo(() => {
    const env = readWebEnv();
    return resolveLiscaHttpBaseUrl(
      httpResolveOptions(env, props.defaultPort, server.activeAddress),
    );
  });

  const localLabel = createMemo(() => resolveLocalLabel(props.defaultPort));
  const probe = useHttpProbeForUrl(() => httpBaseUrl());

  createEffect(() => {
    dispatch({
      type: "syncRuntime",
      httpBaseUrl: httpBaseUrl(),
      localLabel: localLabel(),
      connectionState: probe.state(),
    });
  });

  const connectTo = (address: string | null) => {
    const next = address?.trim() ? address.trim() : null;
    if (props.appId) {
      persistLiscaActiveServer(props.appId, next);
    } else {
      setLiscaActiveServerAddress(next);
    }
    dispatch({ type: "setActiveAddress", activeAddress: next });
  };

  const handleAddServer = (address: string) => {
    dispatch({
      type: "setSavedServers",
      savedServers: addLiscaSavedServer(address, { defaultPort: props.defaultPort }),
    });
  };

  const handleRemoveServer = (address: string) => {
    dispatch({
      type: "setSavedServers",
      savedServers: removeLiscaSavedServer(address),
    });
    if (server.activeAddress === address.trim()) {
      if (props.appId) persistLiscaActiveServer(props.appId, null);
      else setLiscaActiveServerAddress(null);
      dispatch({ type: "setActiveAddress", activeAddress: null });
    }
  };

  return (
    <ShellServerContext.Provider value={server}>
      {props.children}
      <ServerAddressDialog
        activeAddress={server.activeAddress}
        currentHttpBaseUrl={server.httpBaseUrl}
        defaultPort={props.defaultPort}
        localLabel={server.localLabel}
        open={server.settingsOpen}
        savedServers={server.savedServers}
        onAddServer={handleAddServer}
        onConnect={connectTo}
        onOpenChange={(open) => dispatch({ type: "setSettingsOpen", open })}
        onRemoveServer={handleRemoveServer}
      />
    </ShellServerContext.Provider>
  );
}

export function useShellServer(): ShellServer {
  const value = useContext(ShellServerContext);
  if (!value) {
    throw new Error("useShellServer must be used within ShellServerProvider");
  }
  return value;
}
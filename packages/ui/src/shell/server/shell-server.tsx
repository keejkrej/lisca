"use client";

import { WS_PATH } from "@lisca/contracts";
import {
  addLiscaSavedServer,
  readLiscaSavedServers,
  removeLiscaSavedServer,
  resolveLiscaHttpBaseUrl,
  resolveLiscaWsUrl,
  setLiscaActiveServerAddress,
} from "@lisca/utils";
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { ServerAddressDialog } from "./server-address-dialog";
import type { ConnectionState } from "../chrome/connection-status";
import { useWsProbeForUrl } from "./use-shell-ws-probe";

export type ShellServer = {
  wsUrl: string;
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
      wsUrl: string;
      httpBaseUrl: string;
      localLabel: string;
      connectionState: ConnectionState;
    };

const ShellServerContext = createContext<ShellServerData | null>(null);
const ShellServerControlsContext = createContext<Pick<
  ShellServer,
  "openSettings" | "closeSettings"
> | null>(null);

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
        wsUrl: action.wsUrl,
        httpBaseUrl: action.httpBaseUrl,
        localLabel: action.localLabel,
        state: action.connectionState,
      };
  }
}

function createShellServerControls(dispatch: Dispatch<ShellServerAction>) {
  return {
    openSettings: () => dispatch({ type: "openSettings" }),
    closeSettings: () => dispatch({ type: "closeSettings" }),
  };
}

function readWebEnv() {
  return {
    searchParams:
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null,
    viteWsUrl: import.meta.env.VITE_WS_URL,
    viteHttpUrl: import.meta.env.VITE_HTTP_URL,
    viteWsHost: import.meta.env.VITE_WS_HOST,
    viteWsPort: import.meta.env.VITE_WS_PORT,
  };
}

function wsResolveOptions(
  env: ReturnType<typeof readWebEnv>,
  defaultPort: number,
  activeAddress: string | null,
) {
  return {
    searchParams: env.searchParams,
    viteWsUrl: env.viteWsUrl,
    viteWsHost: env.viteWsHost,
    viteWsPort: env.viteWsPort,
    defaultPort,
    wsPath: WS_PATH,
    activeAddress,
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
    viteWsHost: env.viteWsHost,
    viteWsPort: env.viteWsPort,
    defaultPort,
    wsPath: WS_PATH,
    activeAddress,
  };
}

function resolveLocalLabel(defaultPort: number): string {
  const env = readWebEnv();
  const url = resolveLiscaWsUrl(wsResolveOptions(env, defaultPort, null));
  try {
    return new URL(url).host;
  } catch {
    return `127.0.0.1:${defaultPort}`;
  }
}

export function ShellServerProvider({
  defaultPort,
  children,
}: {
  defaultPort: number;
  children: ReactNode;
}) {
  const [data, dispatch] = useReducer(shellServerReducer, null, () => {
    const env = readWebEnv();
    const localLabel = resolveLocalLabel(defaultPort);
    const wsUrl = resolveLiscaWsUrl(wsResolveOptions(env, defaultPort, null));
    return {
      settingsOpen: false,
      savedServers: readLiscaSavedServers(),
      activeAddress: null,
      defaultPort,
      localLabel,
      wsUrl,
      httpBaseUrl: resolveLiscaHttpBaseUrl(httpResolveOptions(env, defaultPort, null)),
      state: "idle" as ConnectionState,
    };
  });
  const controlsRef = useRef<ReturnType<typeof createShellServerControls>>(null!);
  if (!controlsRef.current) {
    controlsRef.current = createShellServerControls(dispatch);
  }
  const env = readWebEnv();
  const wsUrl = resolveLiscaWsUrl(wsResolveOptions(env, defaultPort, data.activeAddress));
  const httpBaseUrl = resolveLiscaHttpBaseUrl(
    httpResolveOptions(env, defaultPort, data.activeAddress),
  );
  const localLabel = resolveLocalLabel(defaultPort);
  const probe = useWsProbeForUrl(wsUrl);

  useEffect(() => {
    dispatch({
      type: "syncRuntime",
      wsUrl,
      httpBaseUrl,
      localLabel,
      connectionState: probe.state,
    });
  }, [httpBaseUrl, localLabel, probe.state, wsUrl]);

  const connectTo = (address: string | null) => {
    const next = address?.trim() ? address.trim() : null;
    setLiscaActiveServerAddress(next);
    dispatch({ type: "setActiveAddress", activeAddress: next });
  };
  const handleAddServer = (address: string) => {
    dispatch({
      type: "setSavedServers",
      savedServers: addLiscaSavedServer(address, {
        defaultPort,
        wsPath: WS_PATH,
      }),
    });
  };
  const handleRemoveServer = (address: string) => {
    dispatch({
      type: "setSavedServers",
      savedServers: removeLiscaSavedServer(address),
    });
    if (data.activeAddress === address.trim()) {
      setLiscaActiveServerAddress(null);
      dispatch({ type: "setActiveAddress", activeAddress: null });
    }
  };

  return (
    <ShellServerControlsContext.Provider value={controlsRef.current}>
      <ShellServerContext.Provider value={data}>
        {children}
        <ServerAddressDialog
          activeAddress={data.activeAddress}
          currentWsUrl={data.wsUrl}
          defaultPort={defaultPort}
          localLabel={data.localLabel}
          open={data.settingsOpen}
          savedServers={data.savedServers}
          onAddServer={handleAddServer}
          onConnect={connectTo}
          onOpenChange={(open) => dispatch({ type: "setSettingsOpen", open })}
          onRemoveServer={handleRemoveServer}
        />
      </ShellServerContext.Provider>
    </ShellServerControlsContext.Provider>
  );
}

export function useShellServer(): ShellServer {
  const data = useContext(ShellServerContext);
  const controls = useContext(ShellServerControlsContext);
  if (!data || !controls) {
    throw new Error("useShellServer must be used within ShellServerProvider");
  }
  return { ...data, ...controls };
}

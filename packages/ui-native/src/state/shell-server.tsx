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
import { useWsProbeForUrl } from "../state/use-shell-ws-probe.ts";
import type { ConnectionState } from "../state/use-shell-ws-probe.ts";
import { ServerAddressDialog } from "../shell/server-address-dialog.tsx";

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

function readExpoEnv() {
  return {
    httpUrl: process.env.EXPO_PUBLIC_LISCA_HTTP_URL,
    wsUrl: process.env.EXPO_PUBLIC_LISCA_WS_URL,
    wsHost: process.env.EXPO_PUBLIC_LISCA_WS_HOST,
    wsPort: process.env.EXPO_PUBLIC_LISCA_WS_PORT,
  };
}

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

function wsResolveOptions(
  expoEnv: ReturnType<typeof readExpoEnv>,
  defaultPort: number,
  activeAddress: string | null,
) {
  return {
    searchParams: null,
    viteWsUrl: expoEnv.wsUrl,
    viteWsHost: expoEnv.wsHost,
    viteWsPort: expoEnv.wsPort,
    defaultPort,
    wsPath: WS_PATH,
    activeAddress,
  };
}

function httpResolveOptions(
  expoEnv: ReturnType<typeof readExpoEnv>,
  defaultPort: number,
  activeAddress: string | null,
) {
  return {
    searchParams: null,
    viteHttpUrl: expoEnv.httpUrl,
    viteWsHost: expoEnv.wsHost,
    viteWsPort: expoEnv.wsPort,
    defaultPort,
    wsPath: WS_PATH,
    activeAddress,
  };
}

function resolveLocalLabel(defaultPort: number, expoEnv: ReturnType<typeof readExpoEnv>): string {
  const url = resolveLiscaWsUrl(wsResolveOptions(expoEnv, defaultPort, null));
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
  const expoEnv = readExpoEnv();
  const [data, dispatch] = useReducer(shellServerReducer, null, () => {
    const localLabel = resolveLocalLabel(defaultPort, expoEnv);
    const wsUrl = resolveLiscaWsUrl(wsResolveOptions(expoEnv, defaultPort, null));
    return {
      settingsOpen: false,
      savedServers: readLiscaSavedServers(),
      activeAddress: null,
      defaultPort,
      localLabel,
      wsUrl,
      httpBaseUrl: resolveLiscaHttpBaseUrl(httpResolveOptions(expoEnv, defaultPort, null)),
      state: "idle" as ConnectionState,
    };
  });
  const controlsRef = useRef<ReturnType<typeof createShellServerControls>>(null!);
  if (!controlsRef.current) {
    controlsRef.current = createShellServerControls(dispatch);
  }
  const wsUrl = resolveLiscaWsUrl(wsResolveOptions(expoEnv, defaultPort, data.activeAddress));
  const httpBaseUrl = resolveLiscaHttpBaseUrl(
    httpResolveOptions(expoEnv, defaultPort, data.activeAddress),
  );
  const localLabel = resolveLocalLabel(defaultPort, expoEnv);
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
  if (!data || !controls) throw new Error("useShellServer must be used within ShellServerProvider");
  return { ...data, ...controls };
}

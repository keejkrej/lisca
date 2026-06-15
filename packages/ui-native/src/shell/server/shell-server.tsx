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
  useContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { useHttpProbeForUrl } from "./use-shell-http-probe";
import type { ConnectionState } from "./use-shell-http-probe";
import { ServerAddressDialog } from "./server-address-dialog";

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

const ShellServerContext = createContext<ShellServerData | null>(null);
const ShellServerControlsContext = createContext<Pick<
  ShellServer,
  "openSettings" | "closeSettings"
> | null>(null);

function readExpoEnv() {
  return {
    httpUrl: process.env.EXPO_PUBLIC_LISCA_HTTP_URL,
    httpHost: process.env.EXPO_PUBLIC_LISCA_HTTP_HOST,
    httpPort: process.env.EXPO_PUBLIC_LISCA_HTTP_PORT,
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

function httpResolveOptions(
  expoEnv: ReturnType<typeof readExpoEnv>,
  defaultPort: number,
  activeAddress: string | null,
) {
  return {
    searchParams: null,
    viteHttpUrl: expoEnv.httpUrl,
    viteHttpHost: expoEnv.httpHost,
    viteHttpPort: expoEnv.httpPort,
    defaultPort,
    activeAddress,
  };
}

function resolveLocalLabel(defaultPort: number, expoEnv: ReturnType<typeof readExpoEnv>): string {
  const url = resolveLiscaHttpBaseUrl(httpResolveOptions(expoEnv, defaultPort, null));
  try {
    return new URL(url).host;
  } catch {
    return `127.0.0.1:${defaultPort}`;
  }
}

export function ShellServerProvider({
  defaultPort,
  appId,
  children,
}: {
  defaultPort: number;
  appId?: LiscaAppId;
  children: ReactNode;
}) {
  const expoEnv = readExpoEnv();
  const [data, dispatch] = useReducer(shellServerReducer, null, () => {
    const localLabel = resolveLocalLabel(defaultPort, expoEnv);
    const persistedAddress = appId ? readLiscaActiveServerForApp(appId) : null;
    if (persistedAddress) {
      setLiscaActiveServerAddress(persistedAddress);
    }
    const httpBaseUrl = resolveLiscaHttpBaseUrl(
      httpResolveOptions(expoEnv, defaultPort, persistedAddress),
    );
    return {
      settingsOpen: false,
      savedServers: readLiscaSavedServers(),
      activeAddress: persistedAddress,
      defaultPort,
      localLabel,
      httpBaseUrl,
      state: "idle" as ConnectionState,
    };
  });
  const controlsRef = useRef<ReturnType<typeof createShellServerControls>>(null!);
  if (!controlsRef.current) {
    controlsRef.current = createShellServerControls(dispatch);
  }
  const httpBaseUrl = resolveLiscaHttpBaseUrl(
    httpResolveOptions(expoEnv, defaultPort, data.activeAddress),
  );
  const localLabel = resolveLocalLabel(defaultPort, expoEnv);
  const probe = useHttpProbeForUrl(httpBaseUrl);

  useEffect(() => {
    dispatch({
      type: "syncRuntime",
      httpBaseUrl,
      localLabel,
      connectionState: probe.state,
    });
  }, [httpBaseUrl, localLabel, probe.state]);

  const connectTo = (address: string | null) => {
    const next = address?.trim() ? address.trim() : null;
    if (appId) {
      persistLiscaActiveServer(appId, next);
    } else {
      setLiscaActiveServerAddress(next);
    }
    dispatch({ type: "setActiveAddress", activeAddress: next });
  };
  const handleAddServer = (address: string) => {
    dispatch({
      type: "setSavedServers",
      savedServers: addLiscaSavedServer(address, { defaultPort }),
    });
  };
  const handleRemoveServer = (address: string) => {
    dispatch({
      type: "setSavedServers",
      savedServers: removeLiscaSavedServer(address),
    });
    if (data.activeAddress === address.trim()) {
      if (appId) persistLiscaActiveServer(appId, null);
      else setLiscaActiveServerAddress(null);
      dispatch({ type: "setActiveAddress", activeAddress: null });
    }
  };

  return (
    <ShellServerControlsContext.Provider value={controlsRef.current}>
      <ShellServerContext.Provider value={data}>
        {children}
        <ServerAddressDialog
          activeAddress={data.activeAddress}
          currentHttpBaseUrl={data.httpBaseUrl}
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

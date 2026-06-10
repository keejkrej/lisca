import { WS_PATH } from "@lisca/contracts";
import {
  addLiscaSavedServer,
  readLiscaSavedServers,
  removeLiscaSavedServer,
  resolveLiscaHttpBaseUrl,
  resolveLiscaWsUrl,
  setLiscaActiveServerAddress,
} from "@lisca/utils";
import { createContext, useContext, useState, type ReactNode } from "react";
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
const ShellServerContext = createContext<ShellServer | null>(null);
function readExpoEnv() {
  return {
    httpUrl: process.env.EXPO_PUBLIC_LISCA_HTTP_URL,
    wsUrl: process.env.EXPO_PUBLIC_LISCA_WS_URL,
    wsHost: process.env.EXPO_PUBLIC_LISCA_WS_HOST,
    wsPort: process.env.EXPO_PUBLIC_LISCA_WS_PORT,
  };
}
export function ShellServerProvider({
  defaultPort,
  children,
}: {
  defaultPort: number;
  children: ReactNode;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedServers, setSavedServers] = useState(() => readLiscaSavedServers());
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const expoEnv = readExpoEnv();
  const resolveOptions = {
    searchParams: null,
    viteWsUrl: expoEnv.wsUrl,
    viteHttpUrl: expoEnv.httpUrl,
    viteWsHost: expoEnv.wsHost,
    viteWsPort: expoEnv.wsPort,
    defaultPort,
    wsPath: WS_PATH,
    activeAddress,
  };
  const localLabel = (() => {
    const url = resolveLiscaWsUrl({
      ...resolveOptions,
      activeAddress: null,
    });
    try {
      return new URL(url).host;
    } catch {
      return `127.0.0.1:${defaultPort}`;
    }
  })();
  const wsUrl = resolveLiscaWsUrl(resolveOptions);
  const httpBaseUrl = resolveLiscaHttpBaseUrl(resolveOptions);
  const probe = useWsProbeForUrl(wsUrl);
  const connectTo = (address: string | null) => {
    const next = address?.trim() ? address.trim() : null;
    setLiscaActiveServerAddress(next);
    setActiveAddress(next);
  };
  const handleAddServer = (address: string) => {
    setSavedServers(
      addLiscaSavedServer(address, {
        defaultPort,
        wsPath: WS_PATH,
      }),
    );
  };
  const handleRemoveServer = (address: string) => {
    setSavedServers(removeLiscaSavedServer(address));
    setActiveAddress((current) => {
      if (current !== address.trim()) return current;
      setLiscaActiveServerAddress(null);
      return null;
    });
  };
  const value = {
    wsUrl,
    httpBaseUrl,
    state: probe.state,
    defaultPort,
    localLabel,
    activeAddress,
    savedServers,
    settingsOpen,
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
  };
  return (
    <ShellServerContext.Provider value={value}>
      {children}
      <ServerAddressDialog
        activeAddress={activeAddress}
        currentWsUrl={wsUrl}
        defaultPort={defaultPort}
        localLabel={localLabel}
        open={settingsOpen}
        savedServers={savedServers}
        onAddServer={handleAddServer}
        onConnect={connectTo}
        onOpenChange={setSettingsOpen}
        onRemoveServer={handleRemoveServer}
      />
    </ShellServerContext.Provider>
  );
}
export function useShellServer(): ShellServer {
  const ctx = useContext(ShellServerContext);
  if (!ctx) throw new Error("useShellServer must be used within ShellServerProvider");
  return ctx;
}

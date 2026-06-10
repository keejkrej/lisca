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
import { createContext, useContext, useState, type ReactNode } from "react";
import { ServerAddressDialog } from "../shell/server-address-dialog";
import type { ConnectionState } from "../shell/connection-status";
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
const ShellServerContext = createContext<ShellServer | null>(null);
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
  const resolveOptions = {
    searchParams:
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null,
    viteWsUrl: import.meta.env.VITE_WS_URL,
    viteHttpUrl: import.meta.env.VITE_HTTP_URL,
    viteWsHost: import.meta.env.VITE_WS_HOST,
    viteWsPort: import.meta.env.VITE_WS_PORT,
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
  if (!ctx) {
    throw new Error("useShellServer must be used within ShellServerProvider");
  }
  return ctx;
}

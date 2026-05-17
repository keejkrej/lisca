import type { HelloMessage } from "@lisca/contracts";
import { WS_PATH } from "@lisca/contracts";
import { resolveLiscaWsUrl } from "@lisca/utils";
import { useEffect, useMemo, useState } from "react";

import type { ConnectionState } from "../shell/connection-status";

export type ShellWsProbe = {
  wsUrl: string;
  state: ConnectionState;
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

  const [state, setState] = useState<ConnectionState>("idle");
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    setState("connecting");
    let cancelled = false;
    let ws: WebSocket | null = null;

    const connectTimer = window.setTimeout(() => {
      if (cancelled) return;

      const socket = new WebSocket(wsUrl);
      ws = socket;

      socket.addEventListener("open", () => {
        if (cancelled) {
          socket.close();
          return;
        }
        setState("open");
        setLog((lines) => [...lines, `connected ${wsUrl}`]);
      });

      socket.addEventListener("message", (ev) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(String(ev.data)) as HelloMessage | { echo?: string };
          setLog((lines) => [...lines, JSON.stringify(data)]);
        } catch {
          setLog((lines) => [...lines, String(ev.data)]);
        }
      });

      socket.addEventListener("close", () => {
        if (cancelled) return;
        setState("closed");
        setLog((lines) => [...lines, "socket closed"]);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(connectTimer);
      if (ws && ws.readyState !== WebSocket.CONNECTING && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
    };
  }, [wsUrl]);

  return { wsUrl, state, log };
}

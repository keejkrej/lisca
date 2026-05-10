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

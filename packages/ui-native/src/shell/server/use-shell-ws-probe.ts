import type { HelloMessage } from "@lisca/contracts";
import { useEffect, useState } from "react";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

const MAX_ATTEMPTS = 40;
const RETRY_MS = 250;

export function useWsProbeForUrl(wsUrl: string): { state: ConnectionState; log: string[] } {
  const [state, setState] = useState<ConnectionState>("idle");
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let connected = false;

    const scheduleRetry = () => {
      if (cancelled || connected || attempt >= MAX_ATTEMPTS) {
        if (!connected && attempt >= MAX_ATTEMPTS) setState("closed");
        return;
      }
      retryTimer = setTimeout(connect, RETRY_MS);
    };

    const connect = () => {
      if (cancelled || connected) return;
      attempt += 1;
      setState("connecting");

      const socket = new WebSocket(wsUrl);
      ws = socket;

      socket.addEventListener("open", () => {
        if (cancelled) {
          socket.close();
          return;
        }
        connected = true;
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
        if (connected) {
          setState("closed");
          setLog((lines) => [...lines, "socket closed"]);
          return;
        }
        setLog((lines) => [...lines, "socket closed"]);
        scheduleRetry();
      });

      socket.addEventListener("error", () => {
        if (cancelled || connected) return;
        scheduleRetry();
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
    };
  }, [wsUrl]);

  return { state, log };
}

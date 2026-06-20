import { useEffect, useState } from "react";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

const MAX_ATTEMPTS = 40;
const RETRY_MS = 250;

export function useHttpProbeForUrl(httpBaseUrl: string): { state: ConnectionState; log: string[] } {
  const [state, setState] = useState<ConnectionState>("idle");
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let connected = false;
    const controller = new AbortController();

    const scheduleRetry = () => {
      if (cancelled || connected || attempt >= MAX_ATTEMPTS) {
        if (!connected && attempt >= MAX_ATTEMPTS) setState("closed");
        return;
      }
      retryTimer = setTimeout(probe, RETRY_MS);
    };

    const probe = () => {
      if (cancelled || connected) return;
      attempt += 1;
      setState("connecting");
      const url = `${httpBaseUrl.replace(/\/$/, "")}/fs/home`;
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
          setLog((lines) => [...lines, cause instanceof Error ? cause.message : String(cause)]);
          scheduleRetry();
        });
    };

    probe();

    return () => {
      cancelled = true;
      controller.abort();
      if (retryTimer !== undefined) clearTimeout(retryTimer);
    };
  }, [httpBaseUrl]);

  return {
    state,
    log,
  };
}

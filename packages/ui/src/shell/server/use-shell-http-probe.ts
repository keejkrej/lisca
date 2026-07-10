import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";
import type { ConnectionState } from "../chrome/connection-status";

export type ShellHttpProbe = {
  httpBaseUrl: string;
  state: ConnectionState;
  log: string[];
};

export type ShellHttpProbeResult = {
  state: Accessor<ConnectionState>;
  log: Accessor<string[]>;
};

const MAX_ATTEMPTS = 40;
const RETRY_MS = 250;

export function useHttpProbeForUrl(httpBaseUrl: string): ShellHttpProbeResult {
  const [state, setState] = createSignal<ConnectionState>("idle");
  const [log, setLog] = createSignal<string[]>([]);

  createEffect(() => {
    const base = httpBaseUrl;
    let cancelled = false;
    let retryTimer: number | undefined;
    let attempt = 0;
    let connected = false;
    const controller = new AbortController();

    const scheduleRetry = () => {
      if (cancelled || connected || attempt >= MAX_ATTEMPTS) {
        if (!connected && attempt >= MAX_ATTEMPTS) setState("closed");
        return;
      }
      retryTimer = window.setTimeout(probe, RETRY_MS);
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

  return {
    state,
    log,
  };
}
import { useEffect, useMemo, useState } from "react";
import type { HelloMessage } from "@lisca/contracts";
import { WS_PATH } from "@lisca/contracts";
import { AppShell } from "@lisca/ui";
import { resolveLiscaWsUrl } from "@lisca/utils";

export function App() {
  const [log, setLog] = useState<string[]>([]);
  const wsUrl = useMemo(() => {
    const params =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    return resolveLiscaWsUrl({
      searchParams: params,
      viteWsUrl: import.meta.env.VITE_WS_URL,
      viteWsHost: import.meta.env.VITE_WS_HOST,
      viteWsPort: import.meta.env.VITE_WS_PORT,
      defaultPort: 8765,
      wsPath: WS_PATH,
    });
  }, []);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    ws.addEventListener("open", () =>
      setLog((l) => [...l, `connected ${wsUrl}`]),
    );
    ws.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as HelloMessage | { echo?: string };
        setLog((l) => [...l, JSON.stringify(data)]);
      } catch {
        setLog((l) => [...l, String(ev.data)]);
      }
    });
    ws.addEventListener("close", () =>
      setLog((l) => [...l, "socket closed"]),
    );
    return () => ws.close();
  }, [wsUrl]);

  return (
    <AppShell title="Aligner">
      <p className="text-sm text-neutral-600 mb-3">
        WebSocket: <code className="font-mono">{wsUrl}</code>
      </p>
      <ul className="list-disc pl-5 space-y-1 text-sm font-mono">
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </AppShell>
  );
}

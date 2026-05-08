import { useEffect, useMemo, useState } from "react";
import type { HelloMessage } from "@lisca/contracts";
import { WS_PATH } from "@lisca/contracts";
import { AppShell } from "@lisca/ui";
import { formatWsUrl } from "@lisca/utils";

export function App() {
  const [log, setLog] = useState<string[]>([]);
  const wsUrl = useMemo(() => {
    const port = Number(import.meta.env.VITE_WS_PORT ?? 8766);
    return formatWsUrl("127.0.0.1", port, WS_PATH);
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
    <AppShell title="Annotator">
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

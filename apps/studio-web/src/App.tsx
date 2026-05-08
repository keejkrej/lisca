import { AppShell, ShellTitleHeader, useShellWsProbe } from "@lisca/ui";

export function App() {
  const probe = useShellWsProbe({ defaultPort: 8767 });

  return (
    <AppShell header={<ShellTitleHeader title="Studio" />}>
      <div className="space-y-4 p-6">
        <p className="text-sm text-neutral-600 mb-3">
          WebSocket:{" "}
          <code className="font-mono rounded bg-neutral-100 px-1.5 py-0.5">{probe.wsUrl}</code>
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm font-mono text-neutral-800">
          {probe.log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

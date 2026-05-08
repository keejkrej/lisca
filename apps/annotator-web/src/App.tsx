import { AppShell, useShellWsProbe, useShellWorkspace } from "@lisca/ui";

import { AnnotatorTopBar } from "./top-bar";

export function App() {
  const probe = useShellWsProbe({ defaultPort: 8766 });
  const workspace = useShellWorkspace();

  return (
    <AppShell header={<AnnotatorTopBar workspace={workspace} probe={probe} />}>
      <div className="space-y-4 p-6">
        <p className="text-sm text-neutral-600">
          Annotation workspace — canvas and tooling plug in here.
        </p>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-neutral-600 mb-2">
            WebSocket:{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-neutral-800">
              {probe.wsUrl}
            </code>
          </p>
          <ul className="list-disc space-y-1 pl-5 font-mono text-xs text-neutral-800">
            {probe.log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

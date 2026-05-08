import type { ShellWsProbe } from "@lisca/ui";

import type { AlignerMode } from "../shell/mode";

export function WorkspaceBody(props: { mode: AlignerMode; probe: ShellWsProbe }) {
  const title = props.mode === "roi" ? "ROI" : "Raw";

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Workspace shell — canvas and tooling plug in here.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm text-neutral-600 mb-2">
          WebSocket:{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-neutral-800">
            {props.probe.wsUrl}
          </code>
        </p>
        <ul className="list-disc space-y-1 pl-5 font-mono text-xs text-neutral-800">
          {props.probe.log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

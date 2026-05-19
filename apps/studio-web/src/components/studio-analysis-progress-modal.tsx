import { Spinner } from "@lisca/ui";
import { clamp } from "@lisca/utils";

import type { AnalysisProgress } from "@lisca/contracts";
import type { StudioAnnotateState } from "../state/use-studio-annotate-state";

function isDoneStatus(status: AnalysisProgress["status"]) {
  return status === "completed" || status === "error";
}

export function StudioAnalysisProgressModal({ state }: { state: StudioAnnotateState }) {
  const progress = state.analysisProgress;
  if (!progress || isDoneStatus(progress.status)) return null;

  const pct = clamp(progress.progress, 0, 100);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm">
      <div
        aria-labelledby="studio-analysis-progress-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <Spinner className="size-4" />
          <div className="min-w-0">
            <div className="font-medium text-foreground">Running analysis</div>
            <div className="truncate text-muted-foreground text-sm">
              {progress.message ?? "Working"}
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-muted-foreground text-xs tabular-nums">
          {Math.round(pct)}%
        </div>
      </div>
    </div>
  );
}

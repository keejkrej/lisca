import { Spinner, DialogSurface, ModalScrim } from "@lisca/ui";

import { clamp } from "@lisca/utils";

import type { AnalysisProgress } from "@lisca/contracts";
import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";

function isDoneStatus(status: AnalysisProgress["status"]) {
  return status === "completed" || status === "error";
}

export function StudioAnalysisProgressModal() {
  const { state } = useStudioAnnotatePage();
  const progress = state.analysisProgress;
  if (!progress || isDoneStatus(progress.status)) return null;

  const pct = clamp(progress.progress, 0, 100);

  return (
    <ModalScrim zIndex="z-40">
      <DialogSurface aria-label="Running analysis" className="p-5" maxWidth="sm">
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
        <div className="mt-2 text-muted-foreground text-xs tabular-nums">{Math.round(pct)}%</div>
      </DialogSurface>
    </ModalScrim>
  );
}

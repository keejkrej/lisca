import type { AnalysisProgress } from "@lisca/contracts";
import { Spinner } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";
import { clamp } from "@lisca/utils";
import { Show, createMemo } from "solid-js";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";

function isDoneStatus(status: AnalysisProgress["status"]) {
  return status === "completed" || status === "error";
}

export function StudioAnalysisProgressModal() {
  const { state } = useStudioAnnotatePage();
  const progress = createMemo(() => state.analysisProgress);
  const visible = createMemo(() => {
    const current = progress();
    return current != null && !isDoneStatus(current.status);
  });
  const pct = createMemo(() => clamp(progress()?.progress ?? 0, 0, 100));

  return (
    <Show when={visible()}>
      <ModalScrim zIndex="z-40">
        <DialogSurface aria-label="Running analysis" class="p-5" maxWidth="sm">
          <div class="flex items-center gap-3">
            <Spinner class="size-4" />
            <div class="min-w-0">
              <div class="font-medium text-foreground">Running analysis</div>
              <div class="truncate text-muted-foreground text-sm">
                {progress()?.message ?? "Working"}
              </div>
            </div>
          </div>
          <div class="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div class="h-full bg-primary" style={{ width: `${pct()}%` }} />
          </div>
          <div class="mt-2 text-muted-foreground text-xs tabular-nums">{Math.round(pct())}%</div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}
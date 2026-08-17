import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";

export function StudioAnalysisStartModal() {
  const { state } = useStudioAnnotatePage();

  return (
    <Show when={state.analysisStartConfirm}>
      <ModalScrim zIndex="z-50">
        <DialogSurface aria-labelledby="studio-analysis-start-title" class="p-5" maxWidth="sm">
          <div class="space-y-4">
            <div class="space-y-1">
              <h2 id="studio-analysis-start-title" class="font-medium text-foreground">
                Start analysis
              </h2>
              <p class="text-muted-foreground text-sm">
                Run analysis now and open results when it finishes?
              </p>
              <p class="text-muted-foreground text-sm">
                Assay settings will be saved to the workspace first. Saved annotations stay as they
                are.
              </p>
            </div>
            <div class="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => state.setAnalysisStartConfirm(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={state.startAnalysis}>
                Start
              </Button>
            </div>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}

import { Button, DialogSurface, ModalScrim } from "@lisca/ui";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";

export function StudioAnalysisStartModal({ state }: { state: StudioAnnotateState }) {
  if (!state.analysisStartConfirm) return null;

  return (
    <ModalScrim zIndex="z-50">
      <DialogSurface aria-labelledby="studio-analysis-start-title" className="p-5" maxWidth="sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 id="studio-analysis-start-title" className="font-medium text-foreground">
              Start analysis
            </h2>
            <p className="text-muted-foreground text-sm">
              Run the transfection analysis pipeline now and open results when finished?
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => state.setAnalysisStartConfirm(false)}
            >
              Cancel
            </Button>
            <Button size="sm" type="button" onClick={state.startAnalysis}>
              Start
            </Button>
          </div>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}

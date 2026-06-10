import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { useStudioStore } from "../state/studio-store";
import { validateAssayForAnalysis } from "../utils/studio-assay-validation";

export function StudioAnalysisStartModal() {
  const { state } = useStudioAnnotatePage();
  const assayId = useStudioStore((store) => store.assayId);
  const info1 = useStudioStore((store) => store.info1);
  const info2 = useStudioStore((store) => store.info2);
  const info3 = useStudioStore((store) => store.info3);

  if (!state.analysisStartConfirm) return null;

  const validation = validateAssayForAnalysis({ assayId, info1, info2, info3 });
  const canStart = validation.ok;

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
            {!canStart ? (
              <ul className="list-disc space-y-1 pl-5 text-destructive text-sm">
                {validation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                assay.json will be saved to the workspace before analysis starts.
              </p>
            )}
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
            <Button disabled={!canStart} size="sm" type="button" onClick={state.startAnalysis}>
              Start
            </Button>
          </div>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}

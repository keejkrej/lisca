import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";

const actionButtonClass = "w-full max-w-48 justify-center";

export function StudioAnnotateDock() {
  const { state } = useStudioAnnotatePage();
  const analysisBusy = Boolean(
    state.analysisProgress &&
      (state.analysisProgress.status === "queued" || state.analysisProgress.status === "running"),
  );
  const disableShuffle = state.scanLoading || state.scan === null || Boolean(state.error);
  const disableNext = state.frameLoading || !state.request || analysisBusy;

  return (
    <DockStrip panels={2}>
      <DockSection title="Instruction">
        <p className="line-clamp-4 text-center text-sm leading-snug">Review cropped ROI frames.</p>
      </DockSection>
      <DockSection title="Action">
        <div className="flex w-full flex-col gap-2">
          <Button
            className={actionButtonClass}
            disabled={disableShuffle}
            size="sm"
            type="button"
            variant="outline"
            onClick={state.shuffleSelection}
          >
            Shuffle
          </Button>
          <Button
            className={actionButtonClass}
            disabled={disableNext}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              state.setAnalysisStartConfirm(true);
            }}
          >
            Next
          </Button>
        </div>
      </DockSection>
    </DockStrip>
  );
}

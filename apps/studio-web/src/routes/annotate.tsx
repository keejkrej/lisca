import { AppShell } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";

import { DockButton } from "../components/dock-button";
import { DockSection } from "../components/dock-section";
import { StudioAnnotateMain } from "../components/studio-annotate-main";
import { StudioDock } from "../components/studio-dock";
import { StudioLeft } from "../components/studio-left";
import { useStudioAnnotateState } from "../state/use-studio-annotate-state";

export const Route = createFileRoute("/annotate")({
  component: AnnotatePage,
});

function AnnotatePage() {
  const annotateState = useStudioAnnotateState();
  const analysisBusy = Boolean(
    annotateState.analysisProgress &&
      (annotateState.analysisProgress.status === "queued" ||
        annotateState.analysisProgress.status === "running"),
  );

  const disableShuffle =
    annotateState.scanLoading || annotateState.scan === null || Boolean(annotateState.error);
  const disableNext = annotateState.frameLoading || !annotateState.request || analysisBusy;

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAnnotateMain state={annotateState} />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction="Review cropped ROI frames."
              tools={
                <DockSection title="Tools">
                  <div aria-hidden="true" />
                </DockSection>
              }
              action={
                <div className="flex w-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <DockButton disabled={disableShuffle} onClick={annotateState.shuffleSelection}>
                      Shuffle
                    </DockButton>
                    <DockButton
                      disabled={disableNext}
                      onClick={() => {
                        annotateState.setAnalysisStartConfirm(true);
                      }}
                    >
                      Next
                    </DockButton>
                  </div>
                </div>
              }
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}

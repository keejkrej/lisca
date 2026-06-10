import { AppShell, DockButton, RouteLoadingFallback, StudioDock } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";

import { StudioAnnotateMain } from "../components/studio-annotate-main";
import { StudioLeft } from "../components/studio-left";
import {
  StudioAnnotatePageProvider,
  useStudioAnnotatePage,
} from "../state/studio-annotate-page-context";

export const Route = createFileRoute("/annotate")({
  component: AnnotatePage,
  pendingComponent: RouteLoadingFallback,
  pendingMs: 0,
});

function AnnotatePage() {
  return (
    <StudioAnnotatePageProvider>
      <AnnotatePageContent />
    </StudioAnnotatePageProvider>
  );
}

function AnnotatePageContent() {
  const { state } = useStudioAnnotatePage();
  const analysisBusy = Boolean(
    state.analysisProgress &&
      (state.analysisProgress.status === "queued" || state.analysisProgress.status === "running"),
  );

  const disableShuffle = state.scanLoading || state.scan === null || Boolean(state.error);
  const disableNext = state.frameLoading || !state.request || analysisBusy;

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAnnotateMain />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              actionLayout="2x1"
              instruction="Review cropped ROI frames."
              action={
                <>
                  <DockButton disabled={disableShuffle} onClick={state.shuffleSelection}>
                    Shuffle
                  </DockButton>
                  <DockButton
                    disabled={disableNext}
                    onClick={() => {
                      state.setAnalysisStartConfirm(true);
                    }}
                  >
                    Next
                  </DockButton>
                </>
              }
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}

import { AppShell, DockButton, RouteLoadingFallback, StudioDock } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";

import { StudioAlignMain } from "../components/studio-align-main";
import { StudioAlignTools } from "../components/studio-align-tools";
import { StudioLeft } from "../components/studio-left";
import { StudioAlignPageProvider, useStudioAlignPage } from "../state/studio-align-page-context";
import { instructionForStep } from "../state/studio-routes";

export const Route = createFileRoute("/align")({
  component: AlignPage,
  pendingComponent: RouteLoadingFallback,
  pendingMs: 0,
});

function AlignPage() {
  return (
    <StudioAlignPageProvider>
      <AlignPageContent />
    </StudioAlignPageProvider>
  );
}

function AlignPageContent() {
  const { state } = useStudioAlignPage();

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAlignMain />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              actionLayout="2x2"
              instruction={instructionForStep("alignPattern")}
              action={
                <>
                  <DockButton
                    disabled={!state.frame || state.saving || state.cropping}
                    onClick={state.resetCurrent}
                  >
                    Reset
                  </DockButton>
                  <DockButton
                    disabled={
                      !state.workspacePath ||
                      state.alignPositions.length === 0 ||
                      state.saving ||
                      state.cropping ||
                      state.findingFirstUnaligned
                    }
                    onClick={() => void state.goToFirstUnaligned()}
                  >
                    Jump
                  </DockButton>
                  <DockButton
                    disabled={!state.canGoBack || state.saving || state.cropping}
                    onClick={state.goBack}
                  >
                    Back
                  </DockButton>
                  <DockButton
                    disabled={!state.frame || state.saving || state.cropping}
                    onClick={() => void state.saveAndAdvance()}
                  >
                    Next
                  </DockButton>
                </>
              }
              tool={<StudioAlignTools />}
              toolLayout="2x2"
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}

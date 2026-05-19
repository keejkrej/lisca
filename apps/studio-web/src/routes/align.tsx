import { AppShell } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";

import { DockButton } from "../components/dock-button";
import { StudioAlignMain } from "../components/studio-align-main";
import { StudioAlignTools } from "../components/studio-align-tools";
import { StudioDock } from "../components/studio-dock";
import { StudioLeft } from "../components/studio-left";
import { useStudioAlignState } from "../state/use-studio-align-state";
import { instructionForStep } from "../state/studio-routes";

export const Route = createFileRoute("/align")({
  component: AlignPage,
});

function AlignPage() {
  const alignState = useStudioAlignState();

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAlignMain state={alignState} />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction={instructionForStep("alignPattern")}
              action={
                <div className="flex w-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <DockButton
                      disabled={!alignState.frame || alignState.saving || alignState.cropping}
                      onClick={alignState.resetCurrent}
                    >
                      Reset
                    </DockButton>
                    <DockButton
                      disabled={
                        !alignState.workspacePath ||
                        !alignState.scan ||
                        alignState.saving ||
                        alignState.cropping ||
                        alignState.findingFirstUnaligned
                      }
                      onClick={() => void alignState.goToFirstUnaligned()}
                    >
                      Jump
                    </DockButton>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <DockButton
                      disabled={!alignState.canGoBack || alignState.saving || alignState.cropping}
                      onClick={alignState.goBack}
                    >
                      Back
                    </DockButton>
                    <DockButton
                      disabled={!alignState.frame || alignState.saving || alignState.cropping}
                      onClick={() => void alignState.saveAndAdvance()}
                    >
                      Next
                    </DockButton>
                  </div>
                </div>
              }
              assay={<StudioAlignTools state={alignState} />}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}

import { AppShell } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";

import {
  StudioAlignBottomPanel,
  StudioAlignMainPanel,
  useStudioAlignState,
} from "../components/studio-align";
import { DockButton, StudioDock } from "../components/studio-dock";
import { StudioNavRail } from "../components/studio-nav-rail";
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
          <StudioNavRail />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <StudioAlignMainPanel state={alignState} />
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction={instructionForStep("alignPattern")}
              action={
                <div className="flex w-full flex-col gap-2">
                  <DockButton
                    disabled={!alignState.canGoBack || alignState.saving}
                    onClick={alignState.goBack}
                  >
                    back
                  </DockButton>
                  <DockButton
                    disabled={!alignState.frame || alignState.saving}
                    loading={alignState.saving}
                    onClick={() => void alignState.saveAndAdvance()}
                  >
                    next
                  </DockButton>
                </div>
              }
              tools={<StudioAlignBottomPanel state={alignState} />}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}

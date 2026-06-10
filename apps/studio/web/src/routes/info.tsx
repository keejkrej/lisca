import { AppShell, DockButton, RouteLoadingFallback, StudioDock } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/react-router";

import { studioHostOperations } from "../api/studio-port";
import { BasicInfoStep1 } from "../components/basic-info-step1";
import { BasicInfoStep2 } from "../components/basic-info-step2";
import { BasicInfoStep3 } from "../components/basic-info-step3";
import { StudioLeft } from "../components/studio-left";
import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { instructionForStep } from "../state/studio-routes";
import { useStudioStore } from "../state/studio-store";

export const Route = createFileRoute("/info")({
  component: InfoPage,
  pendingComponent: RouteLoadingFallback,
  pendingMs: 0,
});

function InfoPage() {
  const { navigateTo } = useStudioNavigate();
  const infoStep = useStudioStore((state) => state.infoStep);
  const setInfoStep = useStudioStore((state) => state.setInfoStep);
  const step = infoStep === 1 ? "info1" : infoStep === 2 ? "info2" : "info3";

  const next = () => {
    if (infoStep < 3) {
      setInfoStep((infoStep + 1) as 1 | 2 | 3);
      return;
    }
    navigateTo("/align");
  };

  const back = () => {
    if (infoStep > 1) {
      setInfoStep((infoStep - 1) as 1 | 2 | 3);
    }
  };

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <div className="mx-auto flex min-h-full w-full min-w-0 max-w-[52rem] flex-col items-center justify-center px-4 py-6 md:px-[100px] md:py-10">
              {infoStep === 1 ? <BasicInfoStep1 hostPort={studioHostOperations} /> : null}
              {infoStep === 2 ? <BasicInfoStep2 /> : null}
              {infoStep === 3 ? <BasicInfoStep3 /> : null}
            </div>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction={instructionForStep(step)}
              action={
                <div className="flex w-full flex-col gap-2">
                  <DockButton disabled={infoStep === 1} onClick={back}>
                    Back
                  </DockButton>
                  <DockButton onClick={next}>Next</DockButton>
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

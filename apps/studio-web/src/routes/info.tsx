import { AppShell, DockButton } from "@lisca/ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { BasicInfoStep1 } from "../components/basic-info-step1";
import { BasicInfoStep2 } from "../components/basic-info-step2";
import { BasicInfoStep3 } from "../components/basic-info-step3";
import { StudioDock } from "../components/studio-dock";
import { StudioLeft } from "../components/studio-left";
import { instructionForStep, validInfo1, validInfo2, validInfo3 } from "../state/studio-routes";
import { useStudioStore } from "../state/studio-store";
import { studioHostOperations } from "../api/studio-port";

export const Route = createFileRoute("/info")({
  component: InfoPage,
});

function InfoPage() {
  const navigate = useNavigate();
  const assayId = useStudioStore((state) => state.assayId);
  const infoStep = useStudioStore((state) => state.infoStep);
  const setInfoStep = useStudioStore((state) => state.setInfoStep);
  const info1 = useStudioStore((state) => state.info1);
  const info2 = useStudioStore((state) => state.info2);
  const info3 = useStudioStore((state) => state.info3);
  const canContinue =
    infoStep === 1
      ? validInfo1(info1)
      : infoStep === 2
        ? validInfo2(info2, assayId)
        : validInfo3(info3);
  const step = infoStep === 1 ? "info1" : infoStep === 2 ? "info2" : "info3";

  const firstInvalidInfoStep = (): 1 | 2 | 3 | null => {
    if (!validInfo1(info1)) return 1;
    if (!validInfo2(info2, assayId)) return 2;
    if (!validInfo3(info3)) return 3;
    return null;
  };

  const next = () => {
    if (infoStep < 3) {
      setInfoStep((infoStep + 1) as 1 | 2 | 3);
      return;
    }
    const invalidStep = firstInvalidInfoStep();
    if (invalidStep) {
      setInfoStep(invalidStep);
      return;
    }
    void navigate({ to: "/align" });
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
                  <DockButton disabled={!canContinue} onClick={next}>
                    Next
                  </DockButton>
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

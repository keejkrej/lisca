import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
import { AppShell } from "@lisca/ui/shell";
import { createFileRoute } from "@tanstack/solid-router";
import { createMemo, Show } from "solid-js";

import { studioHostOperations } from "../api/studio-port";
import { BasicInfoStep1 } from "../components/basic-info-step1";
import { BasicInfoStep2 } from "../components/basic-info-step2";
import { StudioInfoDock } from "../components/studio-info-dock";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { instructionForStep } from "../state/studio-routes";
import { useStudioNavigate } from "../navigation/use-studio-navigate";
import {
  studioWizardActions,
  studioWizardAtom,
  type InfoStep,
} from "../state/studio-store";

export const Route = createFileRoute("/info")({
  component: InfoPage,
});

function InfoPage() {
  const { navigateTo } = useStudioNavigate();
  const wizard = useAtomValue(studioWizardAtom);
  const setWizard = useAtomSet(studioWizardAtom);
  const setInfoStep = (step: InfoStep) => studioWizardActions.setInfoStep(setWizard, step);

  const infoStep = createMemo(() => wizard().infoStep);
  const step = createMemo(() => (infoStep() === 1 ? "info1" : "info2"));

  const next = () => {
    if (infoStep() < 2) {
      setInfoStep((infoStep() + 1) as InfoStep);
      return;
    }
    navigateTo("/align");
  };

  const back = () => {
    if (infoStep() > 1) {
      setInfoStep((infoStep() - 1) as InfoStep);
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
            <div class="mx-auto flex min-h-full w-full min-w-0 max-w-[52rem] flex-col items-center justify-center px-4 py-6 md:px-[100px] md:py-10">
              <Show when={infoStep() === 1}>
                <BasicInfoStep1 hostPort={studioHostOperations} />
              </Show>
              <Show when={infoStep() === 2}>
                <BasicInfoStep2 />
              </Show>
            </div>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioInfoDock infoStep={infoStep()} onBack={back} onNext={next} />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60">
          <StudioRightPanel instruction={() => instructionForStep(step())} />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}
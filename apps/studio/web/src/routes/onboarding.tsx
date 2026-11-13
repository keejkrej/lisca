import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";
import { AppShell } from "@lisca/ui/shell";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";

import { StudioLeft } from "../components/studio-left";
import { StudioOnboardingGuideStep } from "../components/studio-onboarding-view";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import {
  isBasicInfoDirty,
  studioWizardActions,
  studioWizardAtom,
  type AssayId,
} from "../state/studio-store";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

function OnboardingPage() {
  const navigate = useNavigate();
  const wizard = useAtomValue(() => studioWizardAtom);
  const setWizard = useAtomSet(() => studioWizardAtom);

  const finishToAssays = () => {
    void navigate({ to: "/assay" });
  };

  const pickAssayFromGuide = (assayId: AssayId) => {
    const current = wizard();
    if (current.basicInfoSavedSnapshot === null && !isBasicInfoDirty(current)) {
      studioWizardActions.setAssayId(setWizard, assayId);
    }
    finishToAssays();
  };

  const openFeedback = () => {
    void navigate({ to: "/help-us" });
  };

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-rail">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.TopBar>
            <StudioTopBar />
          </AppShell.TopBar>
          <AppShell.Main>
            <AppShell.MainScroll contentClass="max-w-[60rem] items-center px-4 py-6 md:px-12 md:py-10">
              <StudioOnboardingGuideStep
                onFinishToAssays={finishToAssays}
                onOpenFeedback={openFeedback}
                onPickAssay={pickAssayFromGuide}
              />
            </AppShell.MainScroll>
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-rail">
          <StudioRightPanel>
            <PanelSection appearance="rail" title="Action">
              <RailControlStack>
                <Button
                  class="w-full justify-center"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={openFeedback}
                >
                  Help us improve
                </Button>
                <Button
                  class="w-full justify-center"
                  size="sm"
                  type="button"
                  onClick={finishToAssays}
                >
                  Continue to Assay
                </Button>
              </RailControlStack>
            </PanelSection>
          </StudioRightPanel>
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}

import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";
import { AppShell } from "@lisca/ui/shell";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createEffect, createSignal, Show } from "solid-js";

import { StudioLeft } from "../components/studio-left";
import {
  StudioOnboardingGuideStep,
  StudioOnboardingInterestsStep,
  type OnboardingStep,
} from "../components/studio-onboarding-view";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import {
  assaysForAreaFilter,
  defaultAreaFilterForInterests,
  studioOnboardingActions,
  studioOnboardingAtom,
  type AssayAreaFilter,
  type ResearchAreaId,
  type ResearchInterestId,
} from "../state/studio-onboarding";
import {
  isBasicInfoDirty,
  studioWizardActions,
  studioWizardAtom,
  type AssayId,
} from "../state/studio-store";

export type OnboardingSearch = {
  step?: OnboardingStep;
};

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>): OnboardingSearch => ({
    step: search.step === "guide" ? "guide" : search.step === "interests" ? "interests" : undefined,
  }),
  component: OnboardingPage,
});

export function OnboardingPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const onboarding = useAtomValue(() => studioOnboardingAtom);
  const setOnboarding = useAtomSet(() => studioOnboardingAtom);
  const wizard = useAtomValue(() => studioWizardAtom);
  const setWizard = useAtomSet(() => studioWizardAtom);

  const [step, setStep] = createSignal<OnboardingStep>(
    search().step === "guide" ? "guide" : "interests",
  );

  createEffect(() => {
    const requested = search().step;
    if (requested) setStep(requested);
  });

  const canSyncBlankAssay = () =>
    wizard().basicInfoSavedSnapshot === null && !isBasicInfoDirty(wizard());

  const syncBlankAssayForFilter = (
    filter: AssayAreaFilter,
    interests: readonly ResearchInterestId[],
  ) => {
    if (!canSyncBlankAssay()) return;
    const { assayIds } = assaysForAreaFilter(filter, interests);
    const currentAssay = wizard().assayId;
    if (assayIds.length > 0 && (!currentAssay || !assayIds.includes(currentAssay))) {
      studioWizardActions.setAssayId(setWizard, assayIds[0]!);
    }
  };

  const advanceToGuide = () => {
    const current = onboarding().interests;
    if (current.length === 0) {
      studioOnboardingActions.setInterests(setOnboarding, ["exploring"]);
    }
    setStep("guide");
  };

  const skipToAssays = () => {
    studioOnboardingActions.skipOnboarding(setOnboarding);
    void navigate({ to: "/assay" });
  };

  const finishToAssays = (preferredArea?: AssayAreaFilter) => {
    const currentInterests =
      onboarding().interests.length > 0
        ? onboarding().interests
        : (["exploring"] as ResearchInterestId[]);
    const targetArea = preferredArea ?? defaultAreaFilterForInterests(currentInterests);
    studioOnboardingActions.completeOnboarding(setOnboarding, currentInterests, targetArea);
    syncBlankAssayForFilter(targetArea, currentInterests);
    void navigate({ to: "/assay" });
  };

  const pickAssayFromGuide = (assayId: AssayId, areaId: ResearchAreaId) => {
    const currentInterests =
      onboarding().interests.length > 0
        ? onboarding().interests
        : ([areaId] as ResearchInterestId[]);
    studioOnboardingActions.completeOnboarding(setOnboarding, currentInterests, areaId);
    if (canSyncBlankAssay()) {
      studioWizardActions.setAssayId(setWizard, assayId);
    }
    void navigate({ to: "/assay" });
  };

  const openFeedback = () => {
    void navigate({ to: "/help-us" });
  };

  const instruction = () =>
    step() === "interests"
      ? "Pick the research areas you work in, then press Continue to see how LiSCA connects to your measurements and sample outputs."
      : "Review the supported measurements, illustrative sample figures, and method references. Press Continue to open the Assay page.";

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
              <Show
                when={step() === "guide"}
                fallback={
                  <StudioOnboardingInterestsStep
                    selectedInterests={onboarding().interests}
                    onContinue={advanceToGuide}
                    onOpenFeedback={openFeedback}
                    onSkip={skipToAssays}
                    onToggleInterest={(id) =>
                      studioOnboardingActions.toggleInterest(setOnboarding, id)
                    }
                  />
                }
              >
                <StudioOnboardingGuideStep
                  selectedInterests={onboarding().interests}
                  onBackToInterests={() => setStep("interests")}
                  onFinishToAssays={finishToAssays}
                  onOpenFeedback={openFeedback}
                  onPickAssay={pickAssayFromGuide}
                />
              </Show>
            </AppShell.MainScroll>
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-rail">
          <StudioRightPanel instruction={instruction}>
            <PanelSection appearance="rail" title="Action">
              <RailControlStack>
                <Show
                  when={step() === "guide"}
                  fallback={
                    <>
                      <Button
                        class="w-full justify-center"
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={skipToAssays}
                      >
                        Skip
                      </Button>
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
                        onClick={advanceToGuide}
                      >
                        Continue
                      </Button>
                    </>
                  }
                >
                  <Button
                    class="w-full justify-center"
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => setStep("interests")}
                  >
                    Back
                  </Button>
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
                    onClick={() => finishToAssays()}
                  >
                    Continue
                  </Button>
                </Show>
              </RailControlStack>
            </PanelSection>
          </StudioRightPanel>
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}

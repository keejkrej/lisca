import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";
import { AppShell } from "@lisca/ui/shell";
import { Schema } from "effect";

import { StudioLeft } from "../components/studio-left";
import { StudioOnboardingGuideStep } from "../components/studio-onboarding-view";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import { StudioNavigationMessage, StudioNavigationProvider } from "../navigation/studio-router";
import { studioRegistry } from "../state/studio-registry";
import { isBasicInfoDirty, studioStoreActions, studioWizardAtom } from "../state/studio-store";

const AssayIdSchema = Schema.Literals([
  "transfection",
  "killing-death-reporter",
  "killing-engagement",
  "lnp-binding",
]);

const OnboardingMsg = UiSchema.TaggedEnum({
  FinishToAssays: {},
  PickAssay: { assayId: AssayIdSchema },
  OpenFeedback: {},
});

export const OnboardingPage = Html.component({
  name: "OnboardingPage",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: OnboardingMsg,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({}),
  update: {
    FinishToAssays: ($) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to: "/assay" })),
    PickAssay: ($, { assayId }) => {
      const current = studioRegistry.get(studioWizardAtom);
      if (current.basicInfoSavedSnapshot === null && !isBasicInfoDirty(current)) {
        studioStoreActions.setAssayId(assayId);
      }
      return $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to: "/assay" }));
    },
    OpenFeedback: ($) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to: "/help-us" })),
  },
  view: (h) =>
    AppShell(h, {
      key: "onboarding-shell",
      left: StudioLeft(h),
      leftWidthClass: "w-rail",
      topBar: StudioTopBar(h),
      main: AppShell.MainScroll(h, {
        key: "onboarding-scroll",
        contentClass: "max-w-[60rem] items-center px-4 py-6 md:px-12 md:py-10",
        children: StudioOnboardingGuideStep(h, {
          onFinishToAssays: OnboardingMsg.FinishToAssays(),
          onOpenFeedback: OnboardingMsg.OpenFeedback(),
          onPickAssay: (assayId) => OnboardingMsg.PickAssay({ assayId }),
        }),
      }),
      right: StudioRightPanel(h, {
        children: PanelSection(h, {
          key: "onboarding-actions",
          appearance: "rail",
          title: "Action",
          children: RailControlStack(h).children(
            Button(h, {
              class: "w-full justify-center",
              size: "sm",
              type: "button",
              variant: "outline",
              onPress: OnboardingMsg.OpenFeedback(),
            }).children("Help us improve"),
            Button(h, {
              class: "w-full justify-center",
              size: "sm",
              type: "button",
              onPress: OnboardingMsg.FinishToAssays(),
            }).children("Continue to Assay"),
          ),
        }),
      }),
      rightWidthClass: "w-rail",
    }),
});

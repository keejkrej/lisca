import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { AlignStateToggleIndicator } from "@lisca/instrument";
import { Toggle } from "@lisca/ui/primitives";
import { Schema } from "effect";

import { setStudioExpertMode, studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import {
  CommandShortcutHint,
  commandShortcutKeys,
} from "../navigation/use-studio-command-shortcut";
import { setStudioAtom, studioAtomsSubscription, studioRegistry } from "../state/studio-registry";

const ExpertToggleMsg = UiSchema.TaggedEnum({
  Toggled: { pressed: Schema.Boolean },
  Synced: {},
});

const StudioExpertToggleComponent = Html.component({
  name: "StudioExpertToggle",
  props: Schema.Struct({}),
  model: Schema.Struct({
    expertMode: Schema.Boolean,
  }),
  message: ExpertToggleMsg,
}).make({
  init: () => ({ expertMode: studioRegistry.get(studioExpertModeAtom) }),
  update: {
    Toggled: ($, { pressed }) => {
      setStudioAtom(studioExpertModeAtom, pressed);
      setStudioExpertMode(pressed);
      return $.evolve({ expertMode: pressed });
    },
    Synced: ($) => $.evolve({ expertMode: studioRegistry.get(studioExpertModeAtom) }),
  },
  subscriptions: () => [
    studioAtomsSubscription(
      "studio-expert-toggle-atom",
      [studioExpertModeAtom],
      ExpertToggleMsg.Synced(),
    ),
  ],
  view: (h, model) =>
    Toggle(h, {
      ariaLabel: "Expert mode",
      class: "h-7 gap-2 px-2.5 text-xs",
      pressed: model.expertMode,
      size: "sm",
      variant: "outline",
      onToggle: ({ pressed }) => ExpertToggleMsg.Toggled({ pressed }),
    })
      .attr("aria-keyshortcuts", commandShortcutKeys("expert"))
      .attr("data-instrument-state-toggle", "")
      .children(
        AlignStateToggleIndicator(h, { pressed: model.expertMode }),
        h.span.children("Expert"),
        CommandShortcutHint(h, { key: "expert-hint", command: "expert", placement: "inline" }),
      ),
});

export function StudioExpertToggle<M>(
  h: Html.H<M>,
  options?: { readonly key?: string | undefined },
) {
  return StudioExpertToggleComponent(h, {
    ...(options?.key !== undefined ? { key: options.key } : {}),
    props: {},
  });
}

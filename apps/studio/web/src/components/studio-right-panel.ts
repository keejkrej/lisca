import { UiSchema, type View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { RailSidebar } from "@lisca/ui/patterns";
import { Schema } from "effect";

import { studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import { studioAtomsSubscription, studioRegistry } from "../state/studio-registry";

const ExpertPanelMsg = UiSchema.TaggedEnum({
  Sync: {},
});

const StudioExpertModeScope = Html.component({
  name: "StudioRightPanelExpertScope",
  props: Schema.Struct({}),
  model: Schema.Struct({
    expertMode: Schema.Boolean,
  }),
  message: ExpertPanelMsg,
}).make({
  init: () => ({ expertMode: studioRegistry.get(studioExpertModeAtom) }),
  update: {
    Sync: ($) => $.evolve({ expertMode: studioRegistry.get(studioExpertModeAtom) }),
  },
  subscriptions: () => [
    studioAtomsSubscription(
      "studio-right-panel-expert",
      [studioExpertModeAtom],
      ExpertPanelMsg.Sync(),
    ),
  ],
  parts: (_p, model) => ({
    expertMode: model.expertMode,
  }),
});

export type StudioRightPanelOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly children?: View.Input<M, R> | undefined;
  readonly expert?: View.Input<M, R> | undefined;
  readonly expertMode?: boolean | undefined;
};

export function StudioRightPanel<M, R = never>(
  h: Html.H<M>,
  options: StudioRightPanelOptions<M, R>,
) {
  if (options.expert === undefined) {
    return RailSidebar(h, {
      ...(options.key !== undefined ? { key: options.key } : {}),
      children: options.children,
    });
  }

  if (options.expertMode !== undefined) {
    return RailSidebar(h, {
      ...(options.key !== undefined ? { key: options.key } : {}),
      children: options.expertMode ? options.expert : options.children,
    });
  }

  return StudioExpertModeScope(h, {
    ...(options.key !== undefined ? { key: `${options.key}-expert-scope` } : {}),
    props: {},
    view: ({ expertMode }) =>
      RailSidebar(h, {
        ...(options.key !== undefined ? { key: options.key } : {}),
        children: expertMode ? options.expert : options.children,
      }),
  });
}

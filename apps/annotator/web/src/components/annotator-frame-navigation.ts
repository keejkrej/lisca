import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { RoiFrameNavigation, type RoiFrameSelection } from "@lisca/instrument";
import { Schema } from "effect";

import { AnnotatePageContext, getAnnotateState } from "../state/annotate-page-context";
import { selectAnnotateNav } from "../state/annotate-page-selectors";

const SelectionPatchSchema = Schema.Struct({
  pos: Schema.optional(Schema.NullOr(Schema.Number)),
  roi: Schema.optional(Schema.NullOr(Schema.Number)),
  channel: Schema.optional(Schema.NullOr(Schema.Number)),
  timeIndex: Schema.optional(Schema.Number),
  zIndex: Schema.optional(Schema.Number),
});

const AnnotatorFrameNavigationMessage = UiSchema.TaggedEnum({
  ChangedSelection: { patch: SelectionPatchSchema },
});

export const AnnotatorFrameNavigation = Html.component({
  name: "AnnotatorFrameNavigation",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: AnnotatorFrameNavigationMessage,
  reads: {
    page: AnnotatePageContext,
  },
}).make({
  init: () => ({}),
  update: {
    ChangedSelection: ($, { patch }) => {
      const nav = selectAnnotateNav(() => getAnnotateState($.reads.page.controllerId));
      nav.changeSelection(() => nav.setSelection(patch as Partial<RoiFrameSelection>));
      return $.model;
    },
  },
  view: (h) => {
    const nav = selectAnnotateNav(() => getAnnotateState(h.reads.page.controllerId));
    return RoiFrameNavigation(h, {
      position: nav.position,
      scan: nav.scan,
      selection: nav.selection,
      sectionAppearance: "rail",
      onSelectionChange: (patch) => AnnotatorFrameNavigationMessage.ChangedSelection({ patch }),
    });
  },
});

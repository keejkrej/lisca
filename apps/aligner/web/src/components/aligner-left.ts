import { UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { AlignToolSection, ContrastControl } from "@lisca/instrument";
import { RailSidebar } from "@lisca/ui/patterns";
import { Schema } from "effect";

import { AlignPageStore, getAlignerState } from "../state/align-page-context";
import { selectAlignCanvas } from "../state/align-page-selectors";
import { AlignFrameNavigation } from "./align-frame-navigation";

const ContrastWindowMessageSchema = Schema.Struct({
  min: Schema.Number,
  max: Schema.Number,
});

const AlignGridToolModeSchema = Schema.Literals([
  "pan",
  "rotate",
  "zoom-spacing",
  "zoom-pattern",
  "magnifier",
]);

const AlignerLeftMessage = UiSchema.TaggedEnum({
  SetContrast: {
    contrast: Schema.NullOr(ContrastWindowMessageSchema),
    lock: Schema.Boolean,
  },
  SetContrastLocked: { locked: Schema.Boolean },
  SetToolMode: { mode: AlignGridToolModeSchema },
  SetSpacingZoomLocked: { locked: Schema.Boolean },
  SetPatternZoomLocked: { locked: Schema.Boolean },
});

export const AlignerLeft = Html.component({
  name: "AlignerLeft",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: AlignerLeftMessage,
  reads: {
    alignPage: AlignPageStore,
  },
}).make({
  init: () => ({}),
  update: {
    SetContrast: ($, { contrast, lock }) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (!state) return $.model;
      state.setContrast(contrast);
      if (lock) state.setContrastLocked(true);
      return $.model;
    },
    SetContrastLocked: ($, { locked }) => {
      getAlignerState($.reads.alignPage.controllerId)?.setContrastLocked(locked);
      return $.model;
    },
    SetToolMode: ($, { mode }) => {
      getAlignerState($.reads.alignPage.controllerId)?.setToolMode(mode);
      return $.model;
    },
    SetSpacingZoomLocked: ($, { locked }) => {
      getAlignerState($.reads.alignPage.controllerId)?.setSpacingZoomLocked(locked);
      return $.model;
    },
    SetPatternZoomLocked: ($, { locked }) => {
      getAlignerState($.reads.alignPage.controllerId)?.setPatternZoomLocked(locked);
      return $.model;
    },
  },
  view: (h) => {
    void h.reads.alignPage.version;
    const state = getAlignerState(h.reads.alignPage.controllerId);
    if (!state) return View.text("");

    const canvas = selectAlignCanvas(state);

    return RailSidebar(h, {
      key: "aligner-left-rail",
      children: [
        AlignFrameNavigation(h, { key: "frame-navigation", props: {} }),
        ContrastControl(h, {
          key: "contrast-control",
          ariaLabel: "Contrast",
          contrast: canvas.contrast,
          contrastLocked: canvas.contrastLocked,
          disabled: !canvas.frame,
          frame: canvas.frame,
          role: "region",
          sectionAppearance: "rail",
          sectionClassName: "min-h-0 shrink-0",
          sectionContentClassName: "flex min-h-0 flex-col",
          onContrastChange: (contrast, meta) =>
            AlignerLeftMessage.SetContrast({ contrast, lock: meta?.lock ?? false }),
          onContrastLockedChange: (locked) => AlignerLeftMessage.SetContrastLocked({ locked }),
        }),
        AlignToolSection(h, {
          key: "align-tool-section",
          mode: canvas.toolMode,
          spacingZoomLocked: canvas.spacingZoomLocked,
          patternZoomLocked: canvas.patternZoomLocked,
          placement: "rail",
          shortcutsEnabled: true,
          onModeChange: (mode) => AlignerLeftMessage.SetToolMode({ mode }),
          onSpacingZoomLockedChange: (locked) =>
            AlignerLeftMessage.SetSpacingZoomLocked({ locked }),
          onPatternZoomLockedChange: (locked) =>
            AlignerLeftMessage.SetPatternZoomLocked({ locked }),
        }),
      ],
    });
  },
});

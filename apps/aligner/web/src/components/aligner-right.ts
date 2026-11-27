import { UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { AlignGridShapeSchema, AlignGridStateSchema } from "@lisca/contracts";
import { AlignDriftRail, AlignGridRail } from "@lisca/instrument";
import { PanelSection, RailSidebar } from "@lisca/ui/patterns";
import { isAlignDriftTranslationEditable } from "@lisca/utils";
import { Schema } from "effect";

import { AlignPageStore, getAlignerState } from "../state/align-page-context";
import { selectAlignCanvas } from "../state/align-page-selectors";
import { AlignSaveSection } from "./align-save-section";
import { AlignSelectionControls } from "./align-selection-controls";

const AlignerRightMessage = UiSchema.TaggedEnum({
  DetectGrid: { shape: Schema.optional(AlignGridShapeSchema) },
  SetGrid: { grid: AlignGridStateSchema },
  AdjustTranslation: { dx: Schema.Number, dy: Schema.Number },
  ClearDrift: {},
  SetDriftDelta: { dx: Schema.Number, dy: Schema.Number },
  ClearKeyframe: {},
  SetKeyframe: {},
  SetReference: {},
});

export const AlignerRight = Html.component({
  name: "AlignerRight",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: AlignerRightMessage,
  reads: {
    alignPage: AlignPageStore,
  },
}).make({
  init: () => ({}),
  update: {
    DetectGrid: ($, { shape }) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (state) void state.detectGrid(shape);
      return $.model;
    },
    SetGrid: ($, { grid }) => {
      getAlignerState($.reads.alignPage.controllerId)?.setGrid(grid);
      return $.model;
    },
    AdjustTranslation: ($, { dx, dy }) => {
      getAlignerState($.reads.alignPage.controllerId)?.adjustTranslation(dx, dy);
      return $.model;
    },
    ClearDrift: ($) => {
      getAlignerState($.reads.alignPage.controllerId)?.clearDrift();
      return $.model;
    },
    SetDriftDelta: ($, { dx, dy }) => {
      getAlignerState($.reads.alignPage.controllerId)?.setDriftDelta(dx, dy);
      return $.model;
    },
    ClearKeyframe: ($) => {
      getAlignerState($.reads.alignPage.controllerId)?.clearKeyframe();
      return $.model;
    },
    SetKeyframe: ($) => {
      getAlignerState($.reads.alignPage.controllerId)?.setKeyframe();
      return $.model;
    },
    SetReference: ($) => {
      getAlignerState($.reads.alignPage.controllerId)?.setReference();
      return $.model;
    },
  },
  view: (h) => {
    void h.reads.alignPage.version;
    const state = getAlignerState(h.reads.alignPage.controllerId);
    if (!state) return View.text("");

    const canvas = selectAlignCanvas(state);

    return RailSidebar(h, {
      key: "aligner-right-rail",
      children: [
        PanelSection(h, {
          key: "instruction-section",
          appearance: "rail",
          title: "Instruction",
          children: h.p
            .class("text-xs leading-relaxed text-muted-foreground")
            .children(
              "Align the grid to micropatterns, exclude damaged wells, and save each position.",
            ),
        }),
        AlignGridRail(h, {
          key: "align-grid-rail",
          detectLowConfidence: canvas.detectLowConfidence,
          detectReport: canvas.detectReport,
          detecting: canvas.detecting,
          disabled: !canvas.frame || canvas.detecting,
          grid: canvas.grid,
          sectionAppearance: "rail",
          shownTranslation: { tx: canvas.effectiveGrid.tx, ty: canvas.effectiveGrid.ty },
          translationEditable: isAlignDriftTranslationEditable(canvas.drift, canvas.selection.time),
          onDetectGrid: (shape) =>
            AlignerRightMessage.DetectGrid(shape !== undefined ? { shape } : {}),
          onGridChange: (grid) => AlignerRightMessage.SetGrid({ grid }),
          onTranslationDelta: (dx, dy) => AlignerRightMessage.AdjustTranslation({ dx, dy }),
        }),
        AlignDriftRail(h, {
          key: "align-drift-rail",
          assayDefaultTime: canvas.assayDefaultTime,
          disabled: !canvas.frame,
          drift: canvas.drift,
          frame: canvas.frame,
          time: canvas.selection.time,
          times: canvas.scan?.times,
          onClearDrift: AlignerRightMessage.ClearDrift(),
          onDeltaChange: (dx, dy) => AlignerRightMessage.SetDriftDelta({ dx, dy }),
          onClearKeyframe: AlignerRightMessage.ClearKeyframe(),
          onSetKeyframe: AlignerRightMessage.SetKeyframe(),
          onSetReference: AlignerRightMessage.SetReference(),
        }),
        AlignSelectionControls(h, { key: "selection-controls", props: {} }),
        AlignSaveSection(h, { key: "save-section", props: {} }),
      ],
    });
  },
});

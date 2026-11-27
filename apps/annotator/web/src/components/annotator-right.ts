import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  AnnotationControlRail,
  LabelFreeReferencesPanel,
  type AnnotationMode,
} from "@lisca/instrument";
import { PanelSection, RailSidebar } from "@lisca/ui/patterns";
import { Schema } from "effect";

import { AnnotatePageContext, getAnnotateState } from "../state/annotate-page-context";
import { selectAnnotateLabels } from "../state/annotate-page-selectors";
import { AnnotatorSaveSection } from "./annotator-save-section";

const AnnotationModeSchema = Schema.Literals(["classification", "segmentation"]);

const AnnotatorRightMessage = UiSchema.TaggedEnum({
  ChangedMode: { mode: AnnotationModeSchema },
  ChangedOverlayOpacity: { value: Schema.Number },
  ChangedBrushSize: { value: Schema.Number },
  SelectedActiveLabel: { id: Schema.String },
  ClickedOpenLabelDialog: {},
  ClickedUndo: {},
  ClickedRedo: {},
  ClickedDiscard: {},
  CommittedAnnotation: {
    classificationLabelId: Schema.NullOr(Schema.String),
    mask: Schema.Any,
  },
});

export const AnnotatorRight = Html.component({
  name: "AnnotatorRight",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: AnnotatorRightMessage,
  reads: {
    page: AnnotatePageContext,
  },
}).make({
  init: () => ({}),
  update: {
    ChangedMode: ($, { mode }) => {
      const labels = selectAnnotateLabels(() => getAnnotateState($.reads.page.controllerId));
      labels.setMode(mode as AnnotationMode);
      return $.model;
    },
    ChangedOverlayOpacity: ($, { value }) => {
      const labels = selectAnnotateLabels(() => getAnnotateState($.reads.page.controllerId));
      labels.setOverlayOpacity(value);
      return $.model;
    },
    ChangedBrushSize: ($, { value }) => {
      const labels = selectAnnotateLabels(() => getAnnotateState($.reads.page.controllerId));
      labels.setBrushSize(value);
      return $.model;
    },
    SelectedActiveLabel: ($, { id }) => {
      const labels = selectAnnotateLabels(() => getAnnotateState($.reads.page.controllerId));
      labels.setActiveLabelId(id);
      return $.model;
    },
    ClickedOpenLabelDialog: ($) => {
      const labels = selectAnnotateLabels(() => getAnnotateState($.reads.page.controllerId));
      labels.openLabelDialog();
      return $.model;
    },
    ClickedUndo: ($) => {
      const labels = selectAnnotateLabels(() => getAnnotateState($.reads.page.controllerId));
      labels.annotation.undo();
      return $.model;
    },
    ClickedRedo: ($) => {
      const labels = selectAnnotateLabels(() => getAnnotateState($.reads.page.controllerId));
      labels.annotation.redo();
      return $.model;
    },
    ClickedDiscard: ($) => {
      const labels = selectAnnotateLabels(() => getAnnotateState($.reads.page.controllerId));
      labels.annotation.discard();
      return $.model;
    },
    CommittedAnnotation: ($, { classificationLabelId, mask }) => {
      const labels = selectAnnotateLabels(() => getAnnotateState($.reads.page.controllerId));
      labels.annotation.commit({
        classificationLabelId,
        mask: mask as Uint8Array,
      });
      return $.model;
    },
  },
  view: (h) => {
    const labels = selectAnnotateLabels(() => getAnnotateState(h.reads.page.controllerId));
    const controlRail = AnnotationControlRail(h, {
      key: "annotation-control",
      activeLabelId: labels.activeLabelId,
      annotation: {
        current: labels.annotation.current,
        dirty: labels.annotation.dirty,
        canUndo: labels.annotation.canUndo,
        canRedo: labels.annotation.canRedo,
        undo: AnnotatorRightMessage.ClickedUndo(),
        redo: AnnotatorRightMessage.ClickedRedo(),
        discard: AnnotatorRightMessage.ClickedDiscard(),
        commit: (value) =>
          AnnotatorRightMessage.CommittedAnnotation({
            classificationLabelId: value.classificationLabelId,
            mask: value.mask,
          }),
      },
      annotationError: labels.annotationError,
      brushSize: labels.brushSize,
      canEdit: labels.canEdit,
      frame: labels.frame,
      frameError: labels.frameError,
      labels: labels.labels,
      mode: labels.mode,
      openLabelDialog: AnnotatorRightMessage.ClickedOpenLabelDialog(),
      overlayOpacity: labels.overlayOpacity,
      saveError: labels.saveError,
      scanError: labels.scanError,
      sectionAppearance: "rail",
      setActiveLabelId: (id) => AnnotatorRightMessage.SelectedActiveLabel({ id }),
      setBrushSize: (value) => AnnotatorRightMessage.ChangedBrushSize({ value }),
      setMode: (mode) => AnnotatorRightMessage.ChangedMode({ mode }),
      setOverlayOpacity: (value) => AnnotatorRightMessage.ChangedOverlayOpacity({ value }),
      workspacePath: labels.workspacePath,
    });
    const controlRailItems = Array.isArray(controlRail) ? controlRail : [controlRail];

    return RailSidebar(h, {
      children: [
        PanelSection(h, {
          key: "instruction",
          appearance: "rail",
          title: "Instruction",
          children: h.p
            .class("text-xs leading-relaxed text-muted-foreground")
            .children("Paint cell masks or assign classification labels, then save each ROI."),
        }),
        ...controlRailItems,
        LabelFreeReferencesPanel(h, {
          key: "label-free-references",
          props: {
            workspacePath: labels.workspacePath,
          },
        }),
        AnnotatorSaveSection(h, { key: "save-section", props: {} }),
      ],
    });
  },
});

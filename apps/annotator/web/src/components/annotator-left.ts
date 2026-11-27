import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { ContrastWindowSchema, type ContrastWindow } from "@lisca/contracts";
import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
  ContrastControl,
  type AnnotationTool,
} from "@lisca/instrument";
import { PanelSection, RailSidebar } from "@lisca/ui/patterns";
import { Schema } from "effect";

import { AnnotatePageContext, getAnnotateState } from "../state/annotate-page-context";
import { selectAnnotateDock, selectAnnotateNav } from "../state/annotate-page-selectors";
import { AnnotatorFrameNavigation } from "./annotator-frame-navigation";

const AnnotationToolSchema = Schema.Literals([
  "brush",
  "brush-erase",
  "lasso",
  "lasso-erase",
  "smart",
  "smart-erase",
  "magnifier",
]);

const AnnotatorLeftMessage = UiSchema.TaggedEnum({
  ChangedContrast: {
    contrast: Schema.NullOr(ContrastWindowSchema),
    lock: Schema.Boolean,
  },
  ChangedContrastLocked: { locked: Schema.Boolean },
  SelectedTool: { tool: AnnotationToolSchema },
});

export const AnnotatorLeft = Html.component({
  name: "AnnotatorLeft",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: AnnotatorLeftMessage,
  reads: {
    page: AnnotatePageContext,
  },
}).make({
  init: () => ({}),
  update: {
    ChangedContrast: ($, { contrast, lock }) => {
      const nav = selectAnnotateNav(() => getAnnotateState($.reads.page.controllerId));
      if (lock) nav.setContrastLocked(true);
      nav.setContrast(contrast as ContrastWindow | null);
      return $.model;
    },
    ChangedContrastLocked: ($, { locked }) => {
      const nav = selectAnnotateNav(() => getAnnotateState($.reads.page.controllerId));
      nav.setContrastLocked(locked);
      return $.model;
    },
    SelectedTool: ($, { tool }) => {
      const dock = selectAnnotateDock(() => getAnnotateState($.reads.page.controllerId));
      dock.setTool(tool as AnnotationTool);
      return $.model;
    },
  },
  view: (h) => {
    const getState = () => getAnnotateState(h.reads.page.controllerId);
    const nav = selectAnnotateNav(getState);
    const dock = selectAnnotateDock(getState);
    const canEditTools = dock.mode === "segmentation" && dock.shortcutsEnabled;
    const toolActions = buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools, {
      viewable: Boolean(nav.frame),
    });

    return RailSidebar(h, {
      children: [
        AnnotatorFrameNavigation(h, { key: "frame-nav", props: {} }),
        ContrastControl(h, {
          key: "contrast",
          ariaLabel: "Contrast",
          contrast: nav.contrast,
          contrastLocked: nav.contrastLocked,
          disabled: !nav.frame,
          frame: nav.frame,
          role: "region",
          sectionAppearance: "rail",
          sectionClassName: "min-h-0 shrink-0",
          sectionContentClassName: "flex min-h-0 flex-col",
          onContrastChange: (contrast, meta) =>
            AnnotatorLeftMessage.ChangedContrast({
              contrast,
              lock: Boolean(meta?.lock),
            }),
          onContrastLockedChange: (locked) =>
            AnnotatorLeftMessage.ChangedContrastLocked({ locked }),
        }),
        dock.mode === "segmentation"
          ? PanelSection(h, {
              key: "tool-section",
              appearance: "rail",
              title: "Tool",
              children: AnnotationToolGrid(h, {
                key: "tool-grid",
                canEditTools,
                layout: "rail",
                shortcutsEnabled: dock.shortcutsEnabled,
                toolActions,
                onSelectTool: (tool) => AnnotatorLeftMessage.SelectedTool({ tool }),
              }),
            })
          : undefined,
      ],
    });
  },
});

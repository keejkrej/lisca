import { Command, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { CanvasToastStack } from "@lisca/instrument";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";
import { AppShell } from "@lisca/ui/shell";
import { Effect, Schema } from "effect";

import { StudioHelpUsView } from "../components/studio-help-us-view";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioTopBar } from "../components/studio-top-bar";
import { StudioNavigationMessage, StudioNavigationProvider } from "../navigation/studio-router";
import {
  buildStudioFeedbackIssueUrl,
  formatStudioFeedbackMarkdown,
  readStudioFeedbackDraft,
  saveStudioFeedbackDraft,
} from "../state/studio-onboarding";

const HelpUsMsg = UiSchema.TaggedEnum({
  ChangeStudyFocus: { value: Schema.String },
  ChangeMeasurementsNeeded: { value: Schema.String },
  ChangeMissingWorkflow: { value: Schema.String },
  ChangeContact: { value: Schema.String },
  SaveDraft: {},
  CopySummary: {},
  CopySucceeded: { seq: Schema.Number },
  CopyFailed: { seq: Schema.Number },
  ResetCopied: { seq: Schema.Number },
  ExpireStatus: { seq: Schema.Number },
  OpenGitHubIssue: {},
  BackToAssays: {},
});

const CopyMarkdownCmd = Command.make(
  "StudioHelpUsCopySummary",
  { args: { markdown: Schema.String, seq: Schema.Number } },
  ({ markdown, seq }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(markdown),
      catch: () => undefined,
    }).pipe(
      Effect.as(HelpUsMsg.CopySucceeded({ seq })),
      Effect.catch(() => Effect.succeed(HelpUsMsg.CopyFailed({ seq }))),
    ),
);

const ResetCopiedCmd = Command.make(
  "StudioHelpUsResetCopied",
  { args: { seq: Schema.Number } },
  ({ seq }) => Effect.sleep("1800 millis").pipe(Effect.as(HelpUsMsg.ResetCopied({ seq }))),
);

const ExpireStatusCmd = Command.make(
  "StudioHelpUsExpireStatus",
  { args: { seq: Schema.Number } },
  ({ seq }) => Effect.sleep("2500 millis").pipe(Effect.as(HelpUsMsg.ExpireStatus({ seq }))),
);

export const HelpUsPage = Html.component({
  name: "HelpUsPage",
  props: Schema.Struct({}),
  model: Schema.Struct({
    studyFocus: Schema.String,
    measurementsNeeded: Schema.String,
    missingWorkflow: Schema.String,
    contact: Schema.String,
    savedAt: Schema.NullOr(Schema.String),
    copied: Schema.Boolean,
    copiedSeq: Schema.Number,
    statusMessage: Schema.NullOr(Schema.String),
    statusSeq: Schema.Number,
  }),
  message: HelpUsMsg,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => {
    const initialDraft = readStudioFeedbackDraft();
    return {
      studyFocus: initialDraft.studyFocus,
      measurementsNeeded: initialDraft.measurementsNeeded,
      missingWorkflow: initialDraft.missingWorkflow,
      contact: initialDraft.contact,
      savedAt: initialDraft.updatedAt,
      copied: false,
      copiedSeq: 0,
      statusMessage: null,
      statusSeq: 0,
    };
  },
  update: {
    ChangeStudyFocus: ($, { value }) => $.evolve({ studyFocus: value }),
    ChangeMeasurementsNeeded: ($, { value }) => $.evolve({ measurementsNeeded: value }),
    ChangeMissingWorkflow: ($, { value }) => $.evolve({ missingWorkflow: value }),
    ChangeContact: ($, { value }) => $.evolve({ contact: value }),
    SaveDraft: ($) => {
      const saved = saveStudioFeedbackDraft({
        studyFocus: $.model.studyFocus,
        measurementsNeeded: $.model.measurementsNeeded,
        missingWorkflow: $.model.missingWorkflow,
        contact: $.model.contact,
      });
      const nextSeq = $.model.statusSeq + 1;
      return $.evolve({
        savedAt: saved.updatedAt,
        statusMessage: "Saved feedback draft locally.",
        statusSeq: nextSeq,
      }).run(ExpireStatusCmd.make({ seq: nextSeq }));
    },
    CopySummary: ($) => {
      const payload = {
        studyFocus: $.model.studyFocus,
        measurementsNeeded: $.model.measurementsNeeded,
        missingWorkflow: $.model.missingWorkflow,
        contact: $.model.contact,
      };
      const saved = saveStudioFeedbackDraft(payload);
      const markdown = formatStudioFeedbackMarkdown(payload);
      const nextStatusSeq = $.model.statusSeq + 1;
      return $.evolve({
        savedAt: saved.updatedAt,
        statusMessage: "Saved feedback draft locally.",
        statusSeq: nextStatusSeq,
      }).run(CopyMarkdownCmd.make({ markdown, seq: nextStatusSeq + 1 }));
    },
    CopySucceeded: ($, { seq }) => {
      const nextCopiedSeq = $.model.copiedSeq + 1;
      return $.evolve({
        copied: true,
        copiedSeq: nextCopiedSeq,
        statusMessage: "Copied feedback summary to clipboard.",
        statusSeq: seq,
      }).run(ResetCopiedCmd.make({ seq: nextCopiedSeq }), ExpireStatusCmd.make({ seq }));
    },
    CopyFailed: ($, { seq }) =>
      $.evolve({
        statusMessage: "Could not copy summary to clipboard.",
        statusSeq: seq,
      }).run(ExpireStatusCmd.make({ seq })),
    ResetCopied: ($, { seq }) =>
      $.model.copiedSeq === seq ? $.evolve({ copied: false }) : $.model,
    ExpireStatus: ($, { seq }) =>
      $.model.statusSeq === seq ? $.evolve({ statusMessage: null }) : $.model,
    OpenGitHubIssue: ($) => {
      const payload = {
        studyFocus: $.model.studyFocus,
        measurementsNeeded: $.model.measurementsNeeded,
        missingWorkflow: $.model.missingWorkflow,
        contact: $.model.contact,
      };
      const saved = saveStudioFeedbackDraft(payload);
      const url = buildStudioFeedbackIssueUrl(payload);
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      const nextSeq = $.model.statusSeq + 1;
      return $.evolve({
        savedAt: saved.updatedAt,
        statusMessage: "Saved feedback draft locally.",
        statusSeq: nextSeq,
      }).run(ExpireStatusCmd.make({ seq: nextSeq }));
    },
    BackToAssays: ($) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to: "/assay" })),
  },
  view: (h, model) => {
    const toasts = model.statusMessage
      ? [
          model.statusMessage.startsWith("Could not")
            ? { text: model.statusMessage, tone: "error" as const }
            : { text: model.statusMessage },
        ]
      : [];

    return AppShell(h, {
      key: "help-us-shell",
      left: StudioLeft(h),
      leftWidthClass: "w-rail",
      topBar: StudioTopBar(h),
      main: [
        CanvasToastStack(h, { messages: toasts }),
        AppShell.MainScroll(h, {
          key: "help-us-scroll",
          contentClass: "max-w-[52rem] items-center px-4 py-6 md:px-12 md:py-10",
          children: StudioHelpUsView(h, {
            contact: model.contact,
            copied: model.copied,
            measurementsNeeded: model.measurementsNeeded,
            missingWorkflow: model.missingWorkflow,
            savedAt: model.savedAt,
            studyFocus: model.studyFocus,
            onBackToAssays: HelpUsMsg.BackToAssays(),
            onChangeContact: (value) => HelpUsMsg.ChangeContact({ value }),
            onChangeMeasurementsNeeded: (value) => HelpUsMsg.ChangeMeasurementsNeeded({ value }),
            onChangeMissingWorkflow: (value) => HelpUsMsg.ChangeMissingWorkflow({ value }),
            onChangeStudyFocus: (value) => HelpUsMsg.ChangeStudyFocus({ value }),
            onCopySummary: HelpUsMsg.CopySummary(),
            onOpenGitHubIssue: HelpUsMsg.OpenGitHubIssue(),
            onSaveDraft: HelpUsMsg.SaveDraft(),
          }),
        }),
      ],
      right: StudioRightPanel(h, {
        children: PanelSection(h, {
          key: "help-us-actions",
          appearance: "rail",
          title: "Action",
          children: RailControlStack(h).children(
            Button(h, {
              class: "w-full justify-center",
              size: "sm",
              type: "button",
              variant: "outline",
              onPress: HelpUsMsg.SaveDraft(),
            }).children("Save"),
            Button(h, {
              class: "w-full justify-center",
              size: "sm",
              type: "button",
              variant: "outline",
              onPress: HelpUsMsg.CopySummary(),
            }).children(model.copied ? "Copied" : "Copy summary"),
            Button(h, {
              class: "w-full justify-center",
              size: "sm",
              type: "button",
              variant: "outline",
              onPress: HelpUsMsg.OpenGitHubIssue(),
            }).children("Open GitHub issue"),
            Button(h, {
              class: "w-full justify-center",
              size: "sm",
              type: "button",
              onPress: HelpUsMsg.BackToAssays(),
            }).children("Continue"),
          ),
        }),
      }),
      rightWidthClass: "w-rail",
    });
  },
});

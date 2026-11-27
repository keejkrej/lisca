import { Command, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { CanvasToastStack } from "@lisca/instrument";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";
import { Effect, Schema } from "effect";

import {
  CommandShortcutHint,
  commandShortcutKeys,
  studioCommandShortcutSubscription,
} from "../navigation/use-studio-command-shortcut";
import { studioAtomsSubscription } from "../state/studio-registry";
import { studioWizardAtom } from "../state/studio-store";
import { getStudioAssayWorkspacePath, saveStudioAssay } from "../state/use-studio-assay-save";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";

const SaveOutcomeSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("saved") }),
  Schema.Struct({ kind: Schema.Literal("needs_overwrite"), saveTo: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("error"), message: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("skipped") }),
]);

const MetadataActionsMsg = UiSchema.TaggedEnum({
  SaveClicked: {},
  OverwriteConfirmed: {},
  OverwriteCancelled: {},
  SaveFinished: { outcome: SaveOutcomeSchema },
  NoticeExpired: { seq: Schema.Number },
  WizardChanged: {},
});

const RunSaveAssayCmd = Command.make(
  "StudioMetadataSaveAssay",
  { args: { overwrite: Schema.Boolean } },
  ({ overwrite }) =>
    Effect.promise(() => saveStudioAssay(overwrite)).pipe(
      Effect.map((outcome) => MetadataActionsMsg.SaveFinished({ outcome })),
    ),
);

const ExpireNoticeCmd = Command.make(
  "StudioMetadataExpireNotice",
  { args: { seq: Schema.Number } },
  ({ seq }) =>
    Effect.sleep("2500 millis").pipe(Effect.as(MetadataActionsMsg.NoticeExpired({ seq }))),
);

const StudioMetadataActionsComponent = Html.component({
  name: "StudioMetadataActions",
  props: Schema.Struct({}),
  model: Schema.Struct({
    saving: Schema.Boolean,
    saveError: Schema.NullOr(Schema.String),
    saveNotice: Schema.NullOr(Schema.String),
    noticeSeq: Schema.Number,
    overwriteOpen: Schema.Boolean,
    workspacePath: Schema.String,
  }),
  message: MetadataActionsMsg,
}).make({
  init: () => ({
    saving: false,
    saveError: null,
    saveNotice: null,
    noticeSeq: 0,
    overwriteOpen: false,
    workspacePath: getStudioAssayWorkspacePath(),
  }),
  update: {
    SaveClicked: ($) => {
      if ($.model.saving) return $.model;
      return $.evolve({
        saving: true,
        saveError: null,
        saveNotice: null,
        workspacePath: getStudioAssayWorkspacePath(),
      }).run(RunSaveAssayCmd.make({ overwrite: false }));
    },
    OverwriteConfirmed: ($) => {
      if ($.model.saving) return $.model;
      return $.evolve({
        overwriteOpen: false,
        saving: true,
        saveError: null,
        saveNotice: null,
      }).run(RunSaveAssayCmd.make({ overwrite: true }));
    },
    OverwriteCancelled: ($) => $.evolve({ overwriteOpen: false }),
    SaveFinished: ($, { outcome }) => {
      switch (outcome.kind) {
        case "saved": {
          const nextSeq = $.model.noticeSeq + 1;
          return $.evolve({
            saving: false,
            saveError: null,
            saveNotice: "Saved assay",
            noticeSeq: nextSeq,
            overwriteOpen: false,
          }).run(ExpireNoticeCmd.make({ seq: nextSeq }));
        }
        case "needs_overwrite":
          return $.evolve({
            saving: false,
            overwriteOpen: true,
            workspacePath: outcome.saveTo,
          });
        case "error":
          return $.evolve({
            saving: false,
            saveError: outcome.message,
          });
        case "skipped":
          return $.evolve({ saving: false });
      }
    },
    NoticeExpired: ($, { seq }) =>
      $.model.noticeSeq === seq ? $.evolve({ saveNotice: null }) : $.model,
    WizardChanged: ($) => $.evolve({ workspacePath: getStudioAssayWorkspacePath() }),
  },
  subscriptions: ({ model }) => [
    studioCommandShortcutSubscription(
      "save",
      !model.saving && !model.overwriteOpen,
      MetadataActionsMsg.SaveClicked(),
    ),
    studioAtomsSubscription(
      "studio-metadata-actions-wizard",
      [studioWizardAtom],
      MetadataActionsMsg.WizardChanged(),
    ),
  ],
  view: (h, model) => {
    const toast = model.saveError
      ? { text: model.saveError, tone: "error" as const }
      : model.saveNotice
        ? { text: model.saveNotice, tone: "success" as const }
        : null;

    return PanelSection(h, {
      key: "metadata-actions-section",
      appearance: "rail",
      title: "Action",
      children: [
        RailControlStack(h).children(
          Button(h, {
            class: "relative w-full justify-center",
            size: "sm",
            type: "button",
            onPress: MetadataActionsMsg.SaveClicked(),
          })
            .attr("aria-keyshortcuts", commandShortcutKeys("save"))
            .children("Save", CommandShortcutHint(h, { key: "save-hint", command: "save" })),
          toast ? CanvasToastStack(h, { messages: [toast] }) : undefined,
        ),
        AssayOverwriteConfirmModal(h, {
          key: "metadata-overwrite-modal",
          open: model.overwriteOpen,
          saveTo: model.workspacePath,
          onCancel: MetadataActionsMsg.OverwriteCancelled(),
          onOverwrite: MetadataActionsMsg.OverwriteConfirmed(),
        }),
      ],
    });
  },
});

export function StudioMetadataActions<M>(
  h: Html.H<M>,
  options?: { readonly key?: string | undefined },
) {
  return StudioMetadataActionsComponent(h, {
    ...(options?.key !== undefined ? { key: options.key } : {}),
    props: {},
  });
}

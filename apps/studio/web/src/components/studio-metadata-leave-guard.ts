import { Command, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Effect, Schema } from "effect";

import {
  shouldGuardMetadataLeave,
  StudioNavigationMessage,
  StudioNavigationProvider,
} from "../navigation/studio-router";
import { getStudioAssayWorkspacePath, saveStudioAssay } from "../state/use-studio-assay-save";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";
import { AssaySaveConfirmModal } from "./assay-save-confirm-modal";

export { shouldGuardMetadataLeave };

const SaveOutcomeSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("saved") }),
  Schema.Struct({ kind: Schema.Literal("needs_overwrite"), saveTo: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("error"), message: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("skipped") }),
]);

const LeaveGuardMsg = UiSchema.TaggedEnum({
  Cancel: {},
  Skip: {},
  Save: {},
  Overwrite: {},
  SaveFinished: { outcome: SaveOutcomeSchema },
});

const SaveBeforeLeaveCmd = Command.make(
  "StudioMetadataLeaveSave",
  { args: { overwrite: Schema.Boolean } },
  ({ overwrite }) =>
    Effect.promise(() => saveStudioAssay(overwrite)).pipe(
      Effect.map((outcome) => LeaveGuardMsg.SaveFinished({ outcome })),
    ),
);

const StudioMetadataLeaveGuardComponent = Html.component({
  name: "StudioMetadataLeaveGuard",
  props: Schema.Struct({}),
  model: Schema.Struct({
    saving: Schema.Boolean,
    saveError: Schema.NullOr(Schema.String),
    overwriteOpen: Schema.Boolean,
    saveTo: Schema.String,
  }),
  message: LeaveGuardMsg,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({
    saving: false,
    saveError: null,
    overwriteOpen: false,
    saveTo: "",
  }),
  update: {
    Cancel: ($) =>
      $.evolve({ overwriteOpen: false, saveError: null, saving: false }).send(
        StudioNavigationProvider,
        StudioNavigationMessage.CancelLeave(),
      ),
    Skip: ($) =>
      $.evolve({ overwriteOpen: false, saveError: null, saving: false }).send(
        StudioNavigationProvider,
        StudioNavigationMessage.ProceedLeave(),
      ),
    Save: ($) => {
      if ($.model.saving) return $.model;
      return $.evolve({
        saving: true,
        saveError: null,
        saveTo: getStudioAssayWorkspacePath(),
      }).run(SaveBeforeLeaveCmd.make({ overwrite: false }));
    },
    Overwrite: ($) => {
      if ($.model.saving) return $.model;
      return $.evolve({
        overwriteOpen: false,
        saving: true,
        saveError: null,
      }).run(SaveBeforeLeaveCmd.make({ overwrite: true }));
    },
    SaveFinished: ($, { outcome }) => {
      switch (outcome.kind) {
        case "saved":
          return $.evolve({
            saving: false,
            saveError: null,
            overwriteOpen: false,
          }).send(StudioNavigationProvider, StudioNavigationMessage.ProceedLeave());
        case "needs_overwrite":
          return $.evolve({
            saving: false,
            overwriteOpen: true,
            saveTo: outcome.saveTo,
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
  },
  view: (h, model) => {
    const blocked = h.reads.nav.pendingLeaveTo !== null;
    if (!blocked) return View.text("");

    return h.div.class("contents").children(
      AssaySaveConfirmModal(h, {
        key: "leave-save-confirm",
        error: model.saveError,
        open: blocked && !model.overwriteOpen,
        saving: model.saving,
        onCancel: LeaveGuardMsg.Cancel(),
        onSave: LeaveGuardMsg.Save(),
        onSkip: LeaveGuardMsg.Skip(),
      }),
      AssayOverwriteConfirmModal(h, {
        key: "leave-overwrite-confirm",
        open: blocked && model.overwriteOpen,
        saveTo: model.saveTo || getStudioAssayWorkspacePath(),
        onCancel: LeaveGuardMsg.Cancel(),
        onOverwrite: LeaveGuardMsg.Overwrite(),
      }),
    );
  },
});

export function StudioMetadataLeaveGuard<M>(
  h: Html.H<M>,
  options?: { readonly key?: string | undefined },
) {
  return StudioMetadataLeaveGuardComponent(h, {
    ...(options?.key !== undefined ? { key: options.key } : {}),
    props: {},
  });
}

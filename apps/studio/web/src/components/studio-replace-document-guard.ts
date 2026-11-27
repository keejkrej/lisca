import { Command, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Effect, Schema } from "effect";

import {
  getStudioAssayWorkspacePath,
  isStudioAssayDirty,
  saveStudioAssay,
} from "../state/use-studio-assay-save";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";
import { AssaySaveConfirmModal } from "./assay-save-confirm-modal";

export function shouldGuardReplaceDocument(): boolean {
  return isStudioAssayDirty();
}

const SaveOutcomeSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("saved") }),
  Schema.Struct({ kind: Schema.Literal("needs_overwrite"), saveTo: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("error"), message: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("skipped") }),
]);

const ReplaceGuardMsg = UiSchema.TaggedEnum({
  Cancel: {},
  Skip: {},
  Save: {},
  Overwrite: {},
  SaveFinished: { outcome: SaveOutcomeSchema },
});

export const StudioReplaceDocumentGuardEvents = UiSchema.TaggedEnum({
  Confirmed: {},
  Cancelled: {},
});

const SaveBeforeReplaceCmd = Command.make(
  "StudioReplaceDocumentSave",
  { args: { overwrite: Schema.Boolean } },
  ({ overwrite }) =>
    Effect.promise(() => saveStudioAssay(overwrite)).pipe(
      Effect.map((outcome) => ReplaceGuardMsg.SaveFinished({ outcome })),
    ),
);

const StudioReplaceDocumentGuardComponent = Html.component({
  name: "StudioReplaceDocumentGuard",
  props: Schema.Struct({
    open: Schema.Boolean,
  }),
  model: Schema.Struct({
    saving: Schema.Boolean,
    saveError: Schema.NullOr(Schema.String),
    overwriteOpen: Schema.Boolean,
    saveTo: Schema.String,
  }),
  message: ReplaceGuardMsg,
  events: StudioReplaceDocumentGuardEvents,
}).make({
  init: () => ({
    saving: false,
    saveError: null,
    overwriteOpen: false,
    saveTo: "",
  }),
  update: {
    Cancel: ($) =>
      $.evolve({ overwriteOpen: false, saveError: null, saving: false }).emit(
        StudioReplaceDocumentGuardEvents.Cancelled(),
      ),
    Skip: ($) =>
      $.evolve({ overwriteOpen: false, saveError: null, saving: false }).emit(
        StudioReplaceDocumentGuardEvents.Confirmed(),
      ),
    Save: ($) => {
      if ($.model.saving) return $.model;
      return $.evolve({
        saving: true,
        saveError: null,
        saveTo: getStudioAssayWorkspacePath(),
      }).run(SaveBeforeReplaceCmd.make({ overwrite: false }));
    },
    Overwrite: ($) => {
      if ($.model.saving) return $.model;
      return $.evolve({
        overwriteOpen: false,
        saving: true,
        saveError: null,
      }).run(SaveBeforeReplaceCmd.make({ overwrite: true }));
    },
    SaveFinished: ($, { outcome }) => {
      switch (outcome.kind) {
        case "saved":
          return $.evolve({
            saving: false,
            saveError: null,
            overwriteOpen: false,
          }).emit(StudioReplaceDocumentGuardEvents.Confirmed());
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
    if (!h.props.open) return View.text("");

    return h.div.class("contents").children(
      AssaySaveConfirmModal(h, {
        key: "replace-save-confirm",
        description: "The current assay has unsaved changes. Save them first?",
        error: model.saveError,
        open: h.props.open && !model.overwriteOpen,
        saving: model.saving,
        skipLabel: "Don't Save",
        title: "Save changes?",
        onCancel: ReplaceGuardMsg.Cancel(),
        onSave: ReplaceGuardMsg.Save(),
        onSkip: ReplaceGuardMsg.Skip(),
      }),
      AssayOverwriteConfirmModal(h, {
        key: "replace-overwrite-confirm",
        open: h.props.open && model.overwriteOpen,
        saveTo: model.saveTo || getStudioAssayWorkspacePath(),
        onCancel: ReplaceGuardMsg.Cancel(),
        onOverwrite: ReplaceGuardMsg.Overwrite(),
      }),
    );
  },
});

export type StudioReplaceDocumentGuardOptions<M> = {
  readonly key?: string | undefined;
  readonly open: boolean;
  readonly onConfirm: M;
  readonly onCancel: M;
};

/**
 * New and Open replace the current assay, so unsaved changes get a
 * Save / Don't Save / Cancel prompt first (the File → New convention). Saving
 * still goes through the overwrite guard when assay.json already exists.
 */
export function StudioReplaceDocumentGuard<M>(
  h: Html.H<M>,
  options: StudioReplaceDocumentGuardOptions<M>,
) {
  return StudioReplaceDocumentGuardComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: { open: options.open },
    onEmit: {
      Confirmed: () => options.onConfirm,
      Cancelled: () => options.onCancel,
    },
  });
}

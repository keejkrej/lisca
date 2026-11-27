import { Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { FolderSource } from "@lisca/contracts";
import { Button } from "@lisca/ui/button";
import { Field, FieldLabel } from "@lisca/ui/field";
import { Input } from "@lisca/ui/input";
import { ModalScrim } from "@lisca/ui/patterns";
import {
  createFolderSourceParseModal,
  folderParseConfirmError,
} from "@lisca/ui-headless/folder-source-parse-modal";
import type { HostFilePickerOperations } from "@lisca/utils";
import { Context, Effect, Queue, Schema, Stream } from "effect";

/**
 * Runtime host filesystem operations provided to `HostFilePickerDialog` and
 * `FolderSourceParseModal` via Effect Layer.
 */
export const HostFilePickerPort = Context.Reference<HostFilePickerOperations | null>(
  "lisca/HostFilePickerPort",
  { defaultValue: () => null },
);

const FolderSourceParseModalMessage = UiSchema.TaggedEnum({
  StateChanged: {
    subfolderTemplate: Schema.String,
    filenameTemplate: Schema.String,
    error: Schema.NullOr(Schema.String),
    detecting: Schema.Boolean,
    detected: Schema.Boolean,
    statusMessage: Schema.String,
  },
  TypedSubfolder: { value: Schema.String },
  TypedFilename: { value: Schema.String },
  ClickedClose: {},
  ClickedConfirm: {},
});

export const FolderSourceParseModalEvents = UiSchema.TaggedEnum({
  Closed: {},
  Confirmed: {
    source: Schema.Struct({
      kind: Schema.Literal("folder"),
      path: Schema.String,
      subfolderTemplate: Schema.String,
      filenameTemplate: Schema.String,
    }),
  },
});

const FolderSourceParseModalComponent = Html.component({
  name: "FolderSourceParseModal",
  props: Schema.Struct({
    path: Schema.NullOr(Schema.String),
  }),
  model: Schema.Struct({
    subfolderTemplate: Schema.String,
    filenameTemplate: Schema.String,
    error: Schema.NullOr(Schema.String),
    detecting: Schema.Boolean,
    detected: Schema.Boolean,
    statusMessage: Schema.String,
  }),
  message: FolderSourceParseModalMessage,
  events: FolderSourceParseModalEvents,
}).make({
  init: () => ({
    subfolderTemplate: "",
    filenameTemplate: "",
    error: null,
    detecting: false,
    detected: false,
    statusMessage: "",
  }),
  update: {
    StateChanged: ($, msg) =>
      $.set({
        subfolderTemplate: msg.subfolderTemplate,
        filenameTemplate: msg.filenameTemplate,
        error: msg.error,
        detecting: msg.detecting,
        detected: msg.detected,
        statusMessage: msg.statusMessage,
      }),
    TypedSubfolder: ($, { value }) => $.evolve({ subfolderTemplate: value, error: null }),
    TypedFilename: ($, { value }) => $.evolve({ filenameTemplate: value, error: null }),
    ClickedClose: ($) => $.emit(FolderSourceParseModalEvents.Closed()),
    ClickedConfirm: ($) => {
      const path = $.props.path;
      const err = folderParseConfirmError({
        path,
        filenameTemplate: $.model.filenameTemplate,
      });
      if (err || !path) {
        return $.evolve({ error: err });
      }
      return $.evolve({ error: null }).emit(
        FolderSourceParseModalEvents.Confirmed({
          source: {
            kind: "folder",
            path,
            subfolderTemplate: $.model.subfolderTemplate.trim(),
            filenameTemplate: $.model.filenameTemplate.trim(),
          },
        }),
      );
    },
  },
  subscriptions: ({ props }) => [
    props.path !== null &&
      Subscription.make("folder-source-detect", props.path, (path) =>
        Stream.unwrap(
          Effect.gen(function* () {
            const hostPort = yield* HostFilePickerPort;
            if (!hostPort) return Stream.empty;
            return Stream.callback<typeof FolderSourceParseModalMessage.Type>((queue) => {
              const controller = createFolderSourceParseModal({
                path,
                hostPort,
                onConfirm: () => {},
              });
              const emitState = () => {
                const s = controller.getState();
                Queue.offerUnsafe(
                  queue,
                  FolderSourceParseModalMessage.StateChanged({
                    subfolderTemplate: s.subfolderTemplate,
                    filenameTemplate: s.filenameTemplate,
                    error: s.error,
                    detecting: s.detecting,
                    detected: s.detected,
                    statusMessage: s.statusMessage,
                  }),
                );
              };
              const unsubscribe = controller.subscribe(emitState);
              emitState();
              return Effect.addFinalizer(() =>
                Effect.sync(() => {
                  unsubscribe();
                  controller.dispose();
                }),
              );
            });
          }),
        ),
      ),
  ],
  view: (h, model) => {
    const path = h.props.path;
    if (!path) {
      return View.text("");
    }

    const TEMPLATE_HELP =
      "Tokens are {p} or {position}, {t} or {time}, {c} or {channel}, and {z}. Subfolder and filename are both required. Digit width is not fixed: Pos1 and Pos001 both match Pos{p}.";

    return ModalScrim(h, {
      maxWidth: "xl",
      ariaLabelledby: "folder-source-template-title",
      onDismiss: () => FolderSourceParseModalMessage.ClickedClose(),
      children: [
        h.div
          .class("border-b border-border px-5 py-4")
          .children(
            h.h2
              .attr("id", "folder-source-template-title")
              .class("font-semibold text-foreground text-lg")
              .children("Parse image folder"),
            h.p
              .attr("title", path)
              .class("mt-1 truncate text-muted-foreground text-sm")
              .children(path),
          ),
        h.div.class("flex flex-col gap-4 px-5 py-4").children(
          h.p
            .attr("aria-live", "polite")
            .attr("role", "status")
            .class("text-muted-foreground text-sm")
            .children(model.statusMessage),
          h.p.class("text-muted-foreground text-sm").children(TEMPLATE_HELP),
          Field(h, { class: "gap-2" }).children(
            FieldLabel(h, { for: "folder-subfolder-template" }).children("Subfolder template"),
            Input(h, {
              id: "folder-subfolder-template",
              name: "subfolder-template",
              placeholder: "e.g. Pos{p}…",
              type: "text",
              value: model.subfolderTemplate,
              onInput: (value) => FolderSourceParseModalMessage.TypedSubfolder({ value }),
            })
              .attr("autocomplete", "off")
              .attr("spellcheck", "false"),
          ),
          Field(h, { class: "gap-2" }).children(
            FieldLabel(h, { for: "folder-filename-template" }).children("Filename template"),
            Input(h, {
              id: "folder-filename-template",
              name: "filename-template",
              placeholder: "e.g. img_{t}_{c}_{z}.jpg…",
              type: "text",
              value: model.filenameTemplate,
              onInput: (value) => FolderSourceParseModalMessage.TypedFilename({ value }),
            })
              .attr("autocomplete", "off")
              .attr("spellcheck", "false")
              .attr("aria-invalid", model.error ? "true" : "false"),
            model.error
              ? h.p.attr("role", "alert").class("text-destructive text-sm").children(model.error)
              : undefined,
          ),
        ),
        h.div.class("flex justify-end gap-2 border-t border-border px-5 py-4").children(
          Button(h, {
            type: "button",
            variant: "outline",
            onPress: FolderSourceParseModalMessage.ClickedClose(),
          }).children("Cancel"),
          Button(h, {
            type: "button",
            onPress: FolderSourceParseModalMessage.ClickedConfirm(),
          }).children("Open"),
        ),
      ],
    });
  },
});

export type FolderSourceParseModalOptions<M> = {
  readonly key?: string | undefined;
  readonly path: string | null;
  readonly onClose: M;
  readonly onConfirm: (source: FolderSource) => M;
};

export type FolderSourceParseModalProps<M = never> = FolderSourceParseModalOptions<M>;

export function FolderSourceParseModal<M>(h: Html.H<M>, options: FolderSourceParseModalOptions<M>) {
  return FolderSourceParseModalComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: { path: options.path },
    onEmit: {
      Closed: () => options.onClose,
      Confirmed: ({ source }) => options.onConfirm(source),
    },
  });
}

import { Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { AnnotationLabelSchema, type AnnotationLabel } from "@lisca/contracts";
import {
  labelDraftsFrom,
  labelDraftsToLabels,
  normalizeLabelId,
  validateLabelDrafts,
  type LabelDraft,
} from "@lisca/ui-headless/label-creation-form";
import { Button } from "@lisca/ui/button";
import { cn } from "@lisca/ui/cn";
import { Dialog, DIALOG_OVERLAY_CLASS } from "@lisca/ui/dialog";
import { Icon } from "@lisca/ui/icons";
import { Input } from "@lisca/ui/input";
import { dialogSurfaceClasses } from "@lisca/ui/patterns";
import { ScrollArea } from "@lisca/ui/scroll-area";
import { Schema, Stream } from "effect";

const LabelDraftSchema = Schema.Struct({
  draftKey: Schema.String,
  id: Schema.String,
  name: Schema.String,
  color: Schema.String,
});

function labelsSignature(labels: readonly AnnotationLabel[]): string {
  return labels.map((label) => `${label.id}\0${label.name}\0${label.color}`).join("\n");
}

function nextDraftKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const LabelCreationDialogMessage = UiSchema.TaggedEnum({
  SyncedProps: {},
  UpdatedName: { index: Schema.Number, value: Schema.String },
  UpdatedId: { index: Schema.Number, value: Schema.String },
  UpdatedColor: { index: Schema.Number, value: Schema.String },
  AddedDraft: {},
  RemovedDraft: { index: Schema.Number },
  ClickedClose: {},
  ClickedSave: {},
});

export const LabelCreationDialogEvents = UiSchema.TaggedEnum({
  OpenChanged: { open: Schema.Boolean },
  Saved: { labels: Schema.Array(AnnotationLabelSchema) },
});

const LabelCreationDialogComponent = Html.component({
  name: "LiscaLabelCreationDialog",
  props: Schema.Struct({
    open: Schema.Boolean,
    labels: Schema.Array(AnnotationLabelSchema),
    error: Schema.NullOr(Schema.String),
    title: Schema.optional(Schema.String),
    subtitle: Schema.optional(Schema.String),
    workspacePath: Schema.optional(Schema.NullOr(Schema.String)),
    saving: Schema.Boolean,
    saveLabel: Schema.optional(Schema.String),
  }),
  model: Schema.Struct({
    drafts: Schema.Array(LabelDraftSchema),
    localError: Schema.NullOr(Schema.String),
    lastOpen: Schema.Boolean,
    lastLabelsKey: Schema.String,
  }),
  message: LabelCreationDialogMessage,
  events: LabelCreationDialogEvents,
}).make({
  init: ($) => ({
    drafts: labelDraftsFrom([...$.props.labels]),
    localError: null,
    lastOpen: $.props.open,
    lastLabelsKey: labelsSignature($.props.labels),
  }),
  update: {
    SyncedProps: ($) => {
      const nextLabelsKey = labelsSignature($.props.labels);
      const shouldReset =
        $.props.open && (!$.model.lastOpen || nextLabelsKey !== $.model.lastLabelsKey);
      if (shouldReset) {
        return $.evolve({
          drafts: labelDraftsFrom([...$.props.labels]),
          localError: null,
          lastOpen: true,
          lastLabelsKey: nextLabelsKey,
        });
      }
      return $.evolve({
        lastOpen: $.props.open,
        lastLabelsKey: nextLabelsKey,
      });
    },
    UpdatedName: ($, { index, value }) =>
      $.evolve({
        drafts: (drafts) =>
          drafts.map((draft, draftIndex) =>
            draftIndex === index
              ? { ...draft, name: value, id: normalizeLabelId(value) || draft.id }
              : draft,
          ),
      }),
    UpdatedId: ($, { index, value }) =>
      $.evolve({
        drafts: (drafts) =>
          drafts.map((draft, draftIndex) =>
            draftIndex === index ? { ...draft, id: value } : draft,
          ),
      }),
    UpdatedColor: ($, { index, value }) =>
      $.evolve({
        drafts: (drafts) =>
          drafts.map((draft, draftIndex) =>
            draftIndex === index ? { ...draft, color: value } : draft,
          ),
      }),
    AddedDraft: ($) =>
      $.evolve({
        drafts: (drafts) => [
          ...drafts,
          {
            draftKey: nextDraftKey(),
            id: `class-${drafts.length + 1}`,
            name: `Class ${drafts.length + 1}`,
            color: "#a855f7",
          },
        ],
      }),
    RemovedDraft: ($, { index }) =>
      $.evolve({
        drafts: (drafts) => drafts.filter((_, draftIndex) => draftIndex !== index),
      }),
    ClickedClose: ($) => $.emit(LabelCreationDialogEvents.OpenChanged({ open: false })),
    ClickedSave: ($) => {
      if ($.props.saving) return $;
      const drafts: LabelDraft[] = $.model.drafts.map((draft) => ({ ...draft }));
      const validationError = validateLabelDrafts(drafts);
      if (validationError) {
        return $.evolve({ localError: validationError });
      }
      const nextLabels = labelDraftsToLabels(drafts);
      return $.evolve({ localError: null }).emit(
        LabelCreationDialogEvents.Saved({ labels: nextLabels }),
      );
    },
  },
  subscriptions: ({ props, model }) => {
    const labelsKey = labelsSignature(props.labels);
    const shouldSync =
      (props.open && (!model.lastOpen || labelsKey !== model.lastLabelsKey)) ||
      (!props.open && model.lastOpen);
    return [
      shouldSync &&
        Subscription.make("label-dialog-sync", `${props.open ? "1" : "0"}:${labelsKey}`, () =>
          Stream.succeed(LabelCreationDialogMessage.SyncedProps()),
        ),
    ];
  },
  view: (h, model) => {
    const { props } = h;
    if (!props.open) {
      return View.text("");
    }

    const resolvedSubtitle =
      props.subtitle ??
      (props.workspacePath != null ? props.workspacePath : "Select a workspace first");
    const activeError = model.localError ?? props.error;
    const saveDisabled =
      props.saving || (props.workspacePath != null ? !props.workspacePath : false);

    return Dialog(h, {
      props: {
        open: true,
        modal: true,
        disablePointerDismissal: false,
      },
      onEmit: {
        RequestedOpen: () => undefined,
        RequestedClose: () => LabelCreationDialogMessage.ClickedClose(),
        Settled: () => undefined,
      },
      view: (dialog) => {
        const portal = dialog.portal(h.dialog);
        if (!portal) {
          return View.text("");
        }

        return portal.children(
          dialog
            .backdrop(h.div)
            ?.attr("data-lisca-slot", "modal-scrim")
            .class(cn(DIALOG_OVERLAY_CLASS, "overscroll-contain z-50")),
          dialog
            .popup(h.div)
            .attr("role", "dialog")
            .attr("aria-modal", "true")
            .attr("aria-busy", props.saving ? "true" : "false")
            .attr("aria-labelledby", "label-dialog-title")
            .attr("data-slot", "dialog-content")
            .attr("data-max-width", "2xl")
            .attr("data-lisca-slot", "dialog-surface")
            .class(dialogSurfaceClasses({ maxWidth: "2xl", class: "max-h-[86vh]" }))
            .children(
              h.div
                .class("flex items-start justify-between gap-4 border-b border-border px-5 py-4")
                .children(
                  h.div.class("min-w-0").children(
                    h.h2
                      .attr("id", "label-dialog-title")
                      .class("font-semibold text-foreground text-lg")
                      .children(props.title ?? "Create labels"),
                    h.p
                      .attr("title", resolvedSubtitle)
                      .class("truncate text-muted-foreground text-sm")
                      .children(resolvedSubtitle),
                  ),
                  Button(h, {
                    ariaLabel: "Close label dialog",
                    class: "shrink-0",
                    size: "icon-sm",
                    type: "button",
                    variant: "ghost",
                    onPress: LabelCreationDialogMessage.ClickedClose(),
                  }).children(Icon(h, "x", { class: "size-4" })),
                ),
              ScrollArea(h, {
                key: "label-dialog-scroll",
                class: "min-h-0 flex-1",
                contentClass: "flex flex-col gap-3 px-5 py-4",
                children: [
                  h.div
                    .class(
                      "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem_2rem] gap-2 px-1 text-muted-foreground text-xs",
                    )
                    .children(
                      h.span.children("Name"),
                      h.span.children("ID"),
                      h.span.children("Color"),
                      h.span,
                    ),
                  ...model.drafts.map((draft, index) =>
                    h.div
                      .key(draft.draftKey)
                      .class(
                        "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem_2rem] items-center gap-2",
                      )
                      .children(
                        Input(h, {
                          ariaLabel: `Label ${index + 1} name`,
                          disabled: props.saving,
                          name: `labels.${index}.name`,
                          value: draft.name,
                          onInput: (value) =>
                            LabelCreationDialogMessage.UpdatedName({ index, value }),
                        }).attr("autocomplete", "off"),
                        Input(h, {
                          ariaLabel: `Label ${index + 1} id`,
                          disabled: props.saving,
                          name: `labels.${index}.id`,
                          value: draft.id,
                          onInput: (value) =>
                            LabelCreationDialogMessage.UpdatedId({ index, value }),
                        })
                          .attr("autocomplete", "off")
                          .attr("spellcheck", "false"),
                        Input(h, {
                          ariaLabel: `Label ${index + 1} color`,
                          disabled: props.saving,
                          name: `labels.${index}.color`,
                          type: "color",
                          value: draft.color,
                          onInput: (value) =>
                            LabelCreationDialogMessage.UpdatedColor({ index, value }),
                        }).attr("autocomplete", "off"),
                        Button(h, {
                          ariaLabel: `Remove ${draft.name || `label ${index + 1}`}`,
                          disabled: props.saving || model.drafts.length <= 1,
                          size: "icon-sm",
                          type: "button",
                          variant: "ghost",
                          onPress: LabelCreationDialogMessage.RemovedDraft({ index }),
                        }).children(Icon(h, "trash", { class: "size-4" })),
                      ),
                  ),
                  Button(h, {
                    class: "w-fit",
                    disabled: props.saving,
                    size: "sm",
                    type: "button",
                    variant: "outline",
                    onPress: LabelCreationDialogMessage.AddedDraft(),
                  }).children(Icon(h, "plus", { class: "size-4" }), "Add label"),
                  activeError
                    ? h.p
                        .attr("role", "alert")
                        .class("text-destructive text-sm")
                        .children(activeError)
                    : undefined,
                ],
              }),
              h.div.class("flex justify-end gap-2 border-t border-border px-5 py-4").children(
                Button(h, {
                  type: "button",
                  variant: "outline",
                  onPress: LabelCreationDialogMessage.ClickedClose(),
                }).children("Cancel"),
                Button(h, {
                  disabled: saveDisabled,
                  type: "button",
                  onPress: LabelCreationDialogMessage.ClickedSave(),
                }).children(props.saveLabel ?? "Save"),
              ),
            ),
        );
      },
    });
  },
});

export type LabelCreationDialogOptions<M> = {
  readonly key?: string | undefined;
  readonly open: boolean;
  readonly labels: readonly AnnotationLabel[];
  readonly error: string | null;
  readonly onOpenChange: (open: boolean) => M;
  readonly onSave: (labels: AnnotationLabel[]) => M;
  readonly title?: string | undefined;
  readonly subtitle?: string | undefined;
  readonly workspacePath?: string | null | undefined;
  readonly saving?: boolean | undefined;
  readonly saveLabel?: string | undefined;
};

export type LabelCreationDialogProps<M = never> = LabelCreationDialogOptions<M>;

export function LabelCreationDialog<M>(h: Html.H<M>, options: LabelCreationDialogOptions<M>) {
  return LabelCreationDialogComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      open: options.open,
      labels: options.labels,
      error: options.error,
      ...(options.title !== undefined ? { title: options.title } : {}),
      ...(options.subtitle !== undefined ? { subtitle: options.subtitle } : {}),
      ...(options.workspacePath !== undefined ? { workspacePath: options.workspacePath } : {}),
      saving: options.saving ?? false,
      ...(options.saveLabel !== undefined ? { saveLabel: options.saveLabel } : {}),
    },
    onEmit: {
      OpenChanged: ({ open }) => options.onOpenChange(open),
      Saved: ({ labels }) => options.onSave([...labels]),
    },
  });
}

import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { buttonVariants } from "@lisca/ui/button";
import { cn } from "@lisca/ui/cn";
import {
  DropdownMenu,
  DROPDOWN_MENU_CONTENT_CLASS,
  DROPDOWN_MENU_ITEM_CLASS,
} from "@lisca/ui/dropdown-menu";
import { Field, FieldLabel } from "@lisca/ui/field";
import { Schema } from "effect";

import {
  PathPickerTriggerContent,
  pathPickerAccessibleName,
  pathPickerTriggerClass,
} from "./path-picker-field";

const SOURCE_FORMATS = [
  { key: "folder", label: "Folder", hint: "Image sequence" },
  { key: "nd2", label: "ND2", hint: "Nikon" },
  { key: "czi", label: "CZI", hint: "Zeiss" },
] as const;

const SourceFormatKeySchema = Schema.Literals(["folder", "nd2", "czi"]);
export type SourceFormatKey = typeof SourceFormatKeySchema.Type;

const SourcePickerFieldMessage = UiSchema.TaggedEnum({
  SetOpen: { open: Schema.Boolean },
  SetAnchor: {
    anchor: Schema.NullOr(
      Schema.Struct({
        x: Schema.Number,
        y: Schema.Number,
        width: Schema.Number,
        height: Schema.Number,
      }),
    ),
  },
  PickedFormat: { format: SourceFormatKeySchema },
});

const SourcePickerFieldEvents = UiSchema.TaggedEnum({
  OpenFolder: {},
  OpenNd2: {},
  OpenCzi: {},
});

const SourcePickerFieldComponent = Html.component({
  name: "LiscaSourcePickerField",
  props: Schema.Struct({
    id: Schema.String,
    label: Schema.String,
    placeholder: Schema.String,
    value: Schema.String,
    actionLabel: Schema.optional(Schema.String),
  }),
  model: Schema.Struct({
    open: Schema.Boolean,
    anchor: Schema.NullOr(
      Schema.Struct({
        x: Schema.Number,
        y: Schema.Number,
        width: Schema.Number,
        height: Schema.Number,
      }),
    ),
  }),
  message: SourcePickerFieldMessage,
  events: SourcePickerFieldEvents,
}).make({
  init: () => ({ open: false, anchor: null }),
  update: {
    SetOpen: ($, { open }) => $.evolve({ open }),
    SetAnchor: ($, { anchor }) => $.evolve({ anchor }),
    PickedFormat: ($, { format }) => {
      const event =
        format === "folder"
          ? SourcePickerFieldEvents.OpenFolder()
          : format === "nd2"
            ? SourcePickerFieldEvents.OpenNd2()
            : SourcePickerFieldEvents.OpenCzi();
      return $.evolve({ open: false }).emit(event);
    },
  },
  view: (h, model) => {
    const actionLabel = h.props.actionLabel ?? "Browse";
    const title = h.props.value.trim() || h.props.placeholder.trim() || undefined;
    return Field(h, { class: "w-full gap-2" }).children(
      FieldLabel(h, { class: "text-sm font-medium leading-[18px]", for: h.props.id }).children(
        h.props.label,
      ),
      DropdownMenu(h, {
        props: {
          open: model.open,
          side: "bottom",
          align: "start",
          sideOffset: 4,
          ...(model.anchor ? { anchor: model.anchor } : {}),
          items: SOURCE_FORMATS.map((format) => ({
            value: format.key,
            label: format.label,
          })),
        },
        onEmit: {
          RequestedOpen: () => SourcePickerFieldMessage.SetOpen({ open: true }),
          RequestedClose: () => SourcePickerFieldMessage.SetOpen({ open: false }),
          Picked: ({ value }) => {
            if (value === "folder" || value === "nd2" || value === "czi") {
              return SourcePickerFieldMessage.PickedFormat({ format: value });
            }
            return undefined;
          },
          Highlighted: () => undefined,
          RequestedQuery: () => undefined,
          Settled: () => undefined,
        },
        view: (menu) => {
          let trigger = menu
            .trigger({ element: h.button })
            .attr("id", h.props.id)
            .attr(
              "aria-label",
              pathPickerAccessibleName(
                h.props.label,
                h.props.value,
                h.props.placeholder,
                actionLabel,
              ),
            )
            .class(cn(buttonVariants({ variant: "outline", size: "sm" }), pathPickerTriggerClass))
            .on("keydown", () => SourcePickerFieldMessage.SetAnchor({ anchor: null }))
            .on("pointerdown", ({ x, y }) =>
              SourcePickerFieldMessage.SetAnchor({
                anchor: { x, y, width: 0, height: 0 },
              }),
            );

          if (title !== undefined) {
            trigger = trigger.attr("title", title);
          }

          return h.div.class("w-full").children(
            trigger.children(
              PathPickerTriggerContent(h, {
                actionLabel,
                placeholder: h.props.placeholder,
                value: h.props.value,
              }),
            ),
            menu.mounted
              ? menu
                  .positioner(h.div)
                  .class("z-50")
                  .children(
                    menu
                      .popup(h.div)
                      .class(cn(DROPDOWN_MENU_CONTENT_CLASS, "w-max min-w-44 max-w-80"))
                      .children(
                        menu.group({ element: h.div, group: "formats" }).children(
                          ...SOURCE_FORMATS.map((format) =>
                            menu
                              .item({
                                element: h.div.key(format.key),
                                value: format.key,
                              })
                              .class(cn(DROPDOWN_MENU_ITEM_CLASS, "text-[13px]"))
                              .children(
                                h.span.class("flex-1 font-medium").children(format.label),
                                h.span.class("text-muted-foreground text-xs").children(format.hint),
                              ),
                          ),
                        ),
                      ),
                  )
              : undefined,
          );
        },
      }),
    );
  },
});

export type SourcePickerFieldOptions<M> = {
  readonly key?: string | undefined;
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly actionLabel?: string | undefined;
  readonly onOpenFolder: M;
  readonly onOpenNd2: M;
  readonly onOpenCzi: M;
};

export type SourcePickerFieldProps<M = never> = SourcePickerFieldOptions<M>;

/** A read-only source path whose surface opens a format menu; each format opens a picker. */
export function SourcePickerField<M>(h: Html.H<M>, options: SourcePickerFieldOptions<M>) {
  return SourcePickerFieldComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      id: options.id,
      label: options.label,
      placeholder: options.placeholder,
      value: options.value,
      ...(options.actionLabel !== undefined ? { actionLabel: options.actionLabel } : {}),
    },
    onEmit: {
      OpenFolder: () => options.onOpenFolder,
      OpenNd2: () => options.onOpenNd2,
      OpenCzi: () => options.onOpenCzi,
    },
  });
}

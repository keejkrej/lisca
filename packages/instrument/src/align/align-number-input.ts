import { Component, UiSchema } from "@effect/ui";
import { Html, HtmlCommand } from "@effect/ui/html";
import { Input } from "@lisca/ui/input";
import { Schema } from "effect";

function formatNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

const AlignNumberInputRef = Html.ref("AlignNumberInput", "input");

const AlignNumberInputMessage = UiSchema.TaggedEnum({
  InputChanged: { value: Schema.String },
  Blurred: {},
  EnterPressed: {},
  Escaped: {},
});

const AlignNumberInputEvents = UiSchema.TaggedEnum({
  Committed: { value: Schema.Number },
});

const AlignNumberInputComponent = Html.component({
  name: "LiscaAlignNumberInput",
  props: Schema.Struct({
    label: Schema.String,
    value: Schema.Number,
    disabled: Schema.optional(Schema.Boolean),
    min: Schema.optional(Schema.Number),
    step: Schema.optional(Schema.String),
  }),
  model: Schema.Struct({
    draft: Schema.NullOr(Schema.String),
    syncedValue: Schema.Number,
  }),
  message: AlignNumberInputMessage,
  events: AlignNumberInputEvents,
}).make({
  init: ($) => $.set({ draft: null, syncedValue: $.props.value }),
  update: {
    InputChanged: ($, { value }) => $.set({ draft: value, syncedValue: $.props.value }),
    Blurred: ($) => {
      if ($.model.draft === null || $.model.syncedValue !== $.props.value) {
        return $.set({ draft: null, syncedValue: $.props.value });
      }
      const trimmed = $.model.draft.trim();
      const parsed = trimmed === "" ? Number.NaN : Number(trimmed);
      if (!Number.isFinite(parsed) || ($.props.min !== undefined && parsed < $.props.min)) {
        return $.set({ draft: null, syncedValue: $.props.value });
      }
      return $.set({ draft: null, syncedValue: $.props.value }).emit(
        AlignNumberInputEvents.Committed({ value: parsed }),
      );
    },
    EnterPressed: ($) => {
      const blurCmd = HtmlCommand.blur(AlignNumberInputRef, () => Component.noop);
      if ($.model.draft === null || $.model.syncedValue !== $.props.value) {
        return $.set({ draft: null, syncedValue: $.props.value }).run(blurCmd);
      }
      const trimmed = $.model.draft.trim();
      const parsed = trimmed === "" ? Number.NaN : Number(trimmed);
      if (!Number.isFinite(parsed) || ($.props.min !== undefined && parsed < $.props.min)) {
        return $.set({ draft: null, syncedValue: $.props.value }).run(blurCmd);
      }
      return $.set({ draft: null, syncedValue: $.props.value })
        .emit(AlignNumberInputEvents.Committed({ value: parsed }))
        .run(blurCmd);
    },
    Escaped: ($) =>
      $.set({ draft: null, syncedValue: $.props.value }).run(
        HtmlCommand.blur(AlignNumberInputRef, () => Component.noop),
      ),
  },
  view: (h, model) => {
    const displayValue =
      model.draft !== null && model.syncedValue === h.props.value
        ? model.draft
        : formatNumber(h.props.value);

    let builder = Input(h, {
      ariaLabel: h.props.label,
      disabled: h.props.disabled,
      name: h.props.label.toLowerCase().replaceAll(" ", "-"),
      type: "number",
      value: displayValue,
    })
      .ref(AlignNumberInputRef)
      .attr("autocomplete", "off")
      .attr("data-size", "sm")
      .attr("step", h.props.step ?? "any")
      .on("input", ({ value }) => AlignNumberInputMessage.InputChanged({ value }))
      .on("blur", AlignNumberInputMessage.Blurred())
      .on("keydown", ({ key }) => {
        if (key === "Enter") return AlignNumberInputMessage.EnterPressed();
        if (key === "Escape") return AlignNumberInputMessage.Escaped();
        return undefined;
      });

    if (h.props.min !== undefined) {
      builder = builder.attr("min", String(h.props.min));
    }

    return builder;
  },
});

export type AlignNumberInputOptions<M> = {
  readonly key?: string | undefined;
  readonly label: string;
  readonly value: number;
  readonly onCommit: (value: number) => M | undefined;
  readonly disabled?: boolean | undefined;
  readonly min?: number | undefined;
  readonly step?: string | undefined;
};

export type AlignNumberInputProps<M = never> = AlignNumberInputOptions<M>;

export function AlignNumberInput<M>(h: Html.H<M>, options: AlignNumberInputOptions<M>) {
  return AlignNumberInputComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      label: options.label,
      value: options.value,
      ...(options.disabled !== undefined ? { disabled: options.disabled } : {}),
      ...(options.min !== undefined ? { min: options.min } : {}),
      ...(options.step !== undefined ? { step: options.step } : {}),
    },
    onEmit: {
      Committed: ({ value }) => options.onCommit(value),
    },
  });
}

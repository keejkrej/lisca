import { UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button } from "@lisca/ui/button";
import { Field, FieldLabel } from "@lisca/ui/field";
import { Icon } from "@lisca/ui/icons";
import { Section } from "@lisca/ui/patterns";
import { Select } from "@lisca/ui/select";
import { keyboardShortcutsSubscription } from "@lisca/ui/shell";
import { Slider } from "@lisca/ui/slider";
import {
  sliderStepperAriaValueText,
  sliderStepperDisplayLabel,
} from "@lisca/ui-headless/slider-stepper-field";
import {
  findNavigationOptionIndex,
  formatNavigationOptionDisplayLabel,
  stepNavigationValue,
  toNavigationOptions,
  type NavigationOption,
  type NavigationValue,
} from "@lisca/utils";
import { Schema } from "effect";

export type { NavigationOption, NavigationValue };
export { findNavigationOptionIndex, stepNavigationValue, toNavigationOptions };

export type SelectNavigationFieldOptions<T extends NavigationValue, M> = {
  readonly key?: string | undefined;
  readonly label: string;
  readonly value: T;
  readonly options: readonly NavigationOption<T>[];
  readonly onChange: (value: T) => M;
  readonly disabled?: boolean | undefined;
  readonly previousDisabled?: boolean | undefined;
  readonly nextDisabled?: boolean | undefined;
  readonly onPrevious: M;
  readonly onNext: M;
};

export type SliderNavigationFieldOptions<M> = {
  readonly key?: string | undefined;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly valueLabel?: string | undefined;
  readonly axisValues?: readonly number[] | undefined;
  readonly axisLabels?: readonly string[] | undefined;
  readonly onChange?: ((value: number) => M) | undefined;
  readonly onCommit?: ((value: number) => M) | undefined;
  readonly disabled?: boolean | undefined;
  readonly previousDisabled?: boolean | undefined;
  readonly nextDisabled?: boolean | undefined;
  readonly onPrevious: M;
  readonly onNext: M;
};

export type SelectNavigationControlProps<T extends NavigationValue, M = never> = Omit<
  SelectNavigationFieldOptions<T, M>,
  "label"
>;

export type SliderNavigationControlProps<M = never> = Omit<
  SliderNavigationFieldOptions<M>,
  "label"
>;

function NavigationStepButton<M>(
  h: Html.H<M>,
  options: {
    readonly direction: "previous" | "next";
    readonly disabled?: boolean | undefined;
    readonly label: string;
    readonly onPress: M;
  },
) {
  const isPrevious = options.direction === "previous";
  return Button(h, {
    ariaLabel: `${isPrevious ? "Previous" : "Next"} ${options.label}`,
    class: "size-8 p-0 text-foreground",
    disabled: options.disabled,
    size: "icon-sm",
    type: "button",
    variant: "outline",
    onPress: options.onPress,
  }).children(Icon(h, isPrevious ? "caret-left" : "caret-right", { class: "size-4" }));
}

const SelectStepperComponentMessage = UiSchema.TaggedEnum({
  SetOpen: { open: Schema.Boolean },
  Picked: { rawValue: Schema.String },
  Previous: {},
  Next: {},
});

const SelectStepperComponentEvents = UiSchema.TaggedEnum({
  Changed: { rawValue: Schema.String },
  Previous: {},
  Next: {},
});

const SelectStepperOptionSchema = Schema.Struct({
  rawValue: Schema.String,
  label: Schema.String,
});

const SelectStepperInner = Html.component({
  name: "LiscaSelectStepperField",
  props: Schema.Struct({
    label: Schema.String,
    value: Schema.String,
    options: Schema.Array(SelectStepperOptionSchema),
    disabled: Schema.optional(Schema.Boolean),
    previousDisabled: Schema.optional(Schema.Boolean),
    nextDisabled: Schema.optional(Schema.Boolean),
  }),
  model: Schema.Struct({
    open: Schema.Boolean,
  }),
  message: SelectStepperComponentMessage,
  events: SelectStepperComponentEvents,
}).make({
  init: () => ({ open: false }),
  update: {
    SetOpen: ($, { open }) => $.evolve({ open }),
    Picked: ($, { rawValue }) =>
      rawValue === $.props.value
        ? $.evolve({ open: false })
        : $.evolve({ open: false }).emit(SelectStepperComponentEvents.Changed({ rawValue })),
    Previous: ($) => $.emit(SelectStepperComponentEvents.Previous()),
    Next: ($) => $.emit(SelectStepperComponentEvents.Next()),
  },
  view: (h, model) =>
    Field(h, { class: "min-w-0 w-full" }).children(
      FieldLabel(h).children(h.props.label),
      h.div.class("grid w-full grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2").children(
        NavigationStepButton(h, {
          direction: "previous",
          disabled: h.props.previousDisabled,
          label: h.props.label,
          onPress: SelectStepperComponentMessage.Previous(),
        }),
        Select(h, {
          ariaLabel: h.props.label,
          class: "flex items-center",
          triggerClass: "w-full min-w-0 text-sm",
          triggerSize: "sm",
          disabled: h.props.disabled,
          open: model.open,
          placement: "bottom-start",
          value: h.props.value,
          items: h.props.options.map((opt) => ({
            value: opt.rawValue,
            label: formatNavigationOptionDisplayLabel(opt.label),
          })),
          onOpenChange: (open) => SelectStepperComponentMessage.SetOpen({ open }),
          onChange: (next) =>
            next !== null ? SelectStepperComponentMessage.Picked({ rawValue: next }) : undefined,
        }),
        NavigationStepButton(h, {
          direction: "next",
          disabled: h.props.nextDisabled,
          label: h.props.label,
          onPress: SelectStepperComponentMessage.Next(),
        }),
      ),
    ),
});

export function SelectStepperField<T extends NavigationValue, M>(
  h: Html.H<M>,
  options: SelectNavigationFieldOptions<T, M>,
) {
  const valueToOption = new Map<string, T>();
  const serializedOptions = options.options.map((opt) => {
    const rawValue = String(opt.value);
    valueToOption.set(rawValue, opt.value);
    return { rawValue, label: opt.label };
  });

  return SelectStepperInner(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      label: options.label,
      value: String(options.value),
      options: serializedOptions,
      ...(options.disabled !== undefined ? { disabled: options.disabled } : {}),
      ...(options.previousDisabled !== undefined
        ? { previousDisabled: options.previousDisabled }
        : {}),
      ...(options.nextDisabled !== undefined ? { nextDisabled: options.nextDisabled } : {}),
    },
    onEmit: {
      Changed: ({ rawValue }) => {
        const matched = valueToOption.get(rawValue);
        return matched !== undefined ? options.onChange(matched) : undefined;
      },
      Previous: () => options.onPrevious,
      Next: () => options.onNext,
    },
  });
}

export function SliderStepperField<M>(h: Html.H<M>, options: SliderNavigationFieldOptions<M>) {
  const formatOptions = {
    ...(options.axisValues !== undefined ? { axisValues: options.axisValues } : {}),
    ...(options.axisLabels !== undefined ? { axisLabels: options.axisLabels } : {}),
    ...(options.valueLabel !== undefined ? { valueLabel: options.valueLabel } : {}),
  };
  const displayLabel = sliderStepperDisplayLabel(formatOptions, options.value);
  const ariaValueText = sliderStepperAriaValueText(formatOptions, options.value);
  const changeHandler = options.onChange ?? options.onCommit;
  const commitHandler = options.onCommit ?? options.onChange;

  return Field(h, { class: "min-w-0 w-full" }).children(
    FieldLabel(h, { class: "w-full justify-between" }).children(
      h.span.children(options.label),
      displayLabel !== undefined
        ? h.span.class("font-normal text-muted-foreground").children(displayLabel)
        : undefined,
    ),
    h.div.class("grid w-full grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2").children(
      NavigationStepButton(h, {
        direction: "previous",
        disabled: options.previousDisabled,
        label: options.label,
        onPress: options.onPrevious,
      }),
      Slider(h, {
        ...(options.key !== undefined ? { key: options.key } : {}),
        ariaLabel: options.label,
        ariaValuetext: ariaValueText,
        controlClass: "data-[orientation=horizontal]:!min-w-0",
        disabled: options.disabled,
        max: options.max,
        min: options.min,
        step: options.step,
        value: options.value,
        onValueChange: (value) => (value !== options.value ? changeHandler?.(value) : undefined),
        onValueCommitted: (value) => commitHandler?.(value),
      }),
      NavigationStepButton(h, {
        direction: "next",
        disabled: options.nextDisabled,
        label: options.label,
        onPress: options.onNext,
      }),
    ),
  );
}

const FrameShortcutsMessage = UiSchema.TaggedEnum({
  Previous: {},
  Next: {},
});

const FrameShortcutsEvents = UiSchema.TaggedEnum({
  Previous: {},
  Next: {},
});

const FrameNavigationShortcuts = Html.component({
  name: "LiscaFrameNavigationShortcuts",
  props: Schema.Struct({
    enabled: Schema.Boolean,
    previousDisabled: Schema.Boolean,
    nextDisabled: Schema.Boolean,
  }),
  model: Schema.Struct({}),
  message: FrameShortcutsMessage,
  events: FrameShortcutsEvents,
}).make({
  init: () => ({}),
  update: {
    Previous: ($) => $.emit(FrameShortcutsEvents.Previous()),
    Next: ($) => $.emit(FrameShortcutsEvents.Next()),
  },
  subscriptions: ({ props }) => [
    keyboardShortcutsSubscription<typeof FrameShortcutsMessage.Type>(
      [
        ...(props.previousDisabled
          ? []
          : [
              { key: "[", message: FrameShortcutsMessage.Previous() },
              { key: ",", message: FrameShortcutsMessage.Previous() },
              { key: "ArrowLeft", message: FrameShortcutsMessage.Previous() },
            ]),
        ...(props.nextDisabled
          ? []
          : [
              { key: "]", message: FrameShortcutsMessage.Next() },
              { key: ".", message: FrameShortcutsMessage.Next() },
              { key: "ArrowRight", message: FrameShortcutsMessage.Next() },
            ]),
      ],
      { enabled: props.enabled },
    ),
  ],
  view: () => View.text(""),
});

export type FrameNavigationOptions<T extends NavigationValue, M> = {
  readonly key?: string | undefined;
  readonly position?: SelectNavigationControlProps<T, M> | undefined;
  readonly channel?: SelectNavigationControlProps<T, M> | undefined;
  readonly frame?: SliderNavigationControlProps<M> | undefined;
  readonly zPlane?: SliderNavigationControlProps<M> | undefined;
  readonly roi?: SelectNavigationControlProps<T, M> | undefined;
  readonly class?: string | undefined;
  readonly sectionTitle?: string | undefined;
  readonly sectionDescription?: string | undefined;
  readonly sectionClassName?: string | undefined;
  readonly sectionContentClassName?: string | undefined;
  readonly sectionAppearance?: "framed" | "rail" | undefined;
};

export type FrameNavigationProps<T extends NavigationValue, M = never> = FrameNavigationOptions<
  T,
  M
>;

/**
 * Shared stack in a {@link Section} card: optional position, ROI, channel, frame (slider), Z (slider).
 * Registers `[` / `]` keyboard shortcuts for frame stepping outside inputs and dialogs.
 */
export function FrameNavigation<T extends NavigationValue, M>(
  h: Html.H<M>,
  options: FrameNavigationOptions<T, M>,
) {
  return Section(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    appearance: options.sectionAppearance,
    class: options.sectionClassName,
    contentClassName: options.sectionContentClassName,
    description: options.sectionDescription,
    title: options.sectionTitle ?? "Navigation",
    children: h.div
      .class(
        options.class ??
          (options.sectionAppearance === "rail" ? "min-w-0 space-y-2" : "min-w-0 space-y-3"),
      )
      .children(
        options.position
          ? SelectStepperField(h, { key: "nav-position", label: "Position", ...options.position })
          : undefined,
        options.roi
          ? SelectStepperField(h, { key: "nav-roi", label: "ROI", ...options.roi })
          : undefined,
        options.channel
          ? SelectStepperField(h, { key: "nav-channel", label: "Channel", ...options.channel })
          : undefined,
        options.frame
          ? SliderStepperField(h, { key: "nav-frame", label: "Frame", ...options.frame })
          : undefined,
        options.frame
          ? FrameNavigationShortcuts(h, {
              key: "nav-frame-shortcuts",
              props: {
                enabled: !options.frame.disabled,
                previousDisabled: Boolean(options.frame.previousDisabled || options.frame.disabled),
                nextDisabled: Boolean(options.frame.nextDisabled || options.frame.disabled),
              },
              onEmit: {
                Previous: () => options.frame!.onPrevious,
                Next: () => options.frame!.onNext,
              },
            })
          : undefined,
        options.zPlane
          ? SliderStepperField(h, { key: "nav-z", label: "Z plane", ...options.zPlane })
          : undefined,
      ),
  });
}

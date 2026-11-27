import { Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { AnnotationLabel } from "@lisca/contracts";
import type { AnnotationMode } from "@lisca/ui-headless/types";
import { Button } from "@lisca/ui/button";
import { Icon } from "@lisca/ui/icons";
import { PanelSection, RailActionPair, RailControlStack } from "@lisca/ui/patterns";
import { createEmptyMask, labelColorStyle, type FrameResult } from "@lisca/utils";
import { Effect, Queue, Schema, Stream } from "effect";

import { AnnotationModeToggle } from "./annotation-mode-toggle";
import { AnnotationToolSlider } from "./annotation-tool-slider";

const LABEL_SHORTCUT_LIMIT = 9;

/** Digit-row code. Shift+1 reports key "!" on a US layout, so the code is the stable signal. */
function labelShortcutDigit(event: KeyboardEvent): number | null {
  if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
    return null;
  }
  const match = /^Digit([1-9])$/.exec(event.code);
  return match ? Number(match[1]) : null;
}

function labelShortcutBlocked(target: EventTarget | null): boolean {
  if (target instanceof Element) {
    if (target.closest("input, textarea, select, [contenteditable='true']")) return true;
    if (target.closest("[role='dialog'], dialog")) return true;
  }
  return Boolean(document.querySelector("[role='dialog'], dialog[open]"));
}

const LabelShortcutMessage = UiSchema.TaggedEnum({
  Pressed: { index: Schema.Number },
});

const LabelShortcutEvents = UiSchema.TaggedEnum({
  Pressed: { index: Schema.Number },
});

const LabelShortcutListener = Html.component({
  name: "LiscaAnnotationLabelShortcutListener",
  props: Schema.Struct({
    enabled: Schema.Boolean,
    labelCount: Schema.Number,
  }),
  model: Schema.Struct({}),
  message: LabelShortcutMessage,
  events: LabelShortcutEvents,
}).make({
  init: () => ({}),
  update: {
    Pressed: ($, { index }) => $.emit(LabelShortcutEvents.Pressed({ index })),
  },
  subscriptions: ({ props }) => [
    props.enabled &&
      props.labelCount > 0 &&
      Subscription.make("annotation-label-shortcuts", props.labelCount, (labelCount) => {
        if (typeof window === "undefined") return Stream.empty;
        return Stream.callback<typeof LabelShortcutMessage.Type>((queue) => {
          const onKeyDown = (event: KeyboardEvent) => {
            const digit = labelShortcutDigit(event);
            if (digit === null || digit > labelCount || labelShortcutBlocked(event.target)) {
              return;
            }
            event.preventDefault();
            Queue.offerUnsafe(queue, LabelShortcutMessage.Pressed({ index: digit - 1 }));
          };
          window.addEventListener("keydown", onKeyDown);
          return Effect.addFinalizer(() =>
            Effect.sync(() => {
              window.removeEventListener("keydown", onKeyDown);
            }),
          );
        });
      }),
  ],
  view: () => View.text(""),
});

export type AnnotationControlValue = {
  readonly classificationLabelId: string | null;
  readonly mask: Uint8Array;
};

export type AnnotationControlHandle<M = never> = {
  readonly current: AnnotationControlValue;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undo: M;
  readonly redo: M;
  readonly discard: M;
  readonly commit: (value: AnnotationControlValue) => M;
};

export type AnnotationControlRailOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly labels: readonly AnnotationLabel[];
  readonly mode: AnnotationMode;
  readonly overlayOpacity: number;
  readonly brushSize: number;
  readonly activeLabelId: string | null;
  readonly annotation: AnnotationControlHandle<M>;
  readonly canEdit: boolean;
  readonly scanError?: string | null | undefined;
  readonly frameError?: string | null | undefined;
  readonly annotationError?: string | null | undefined;
  readonly saveError?: string | null | undefined;
  readonly workspacePath?: string | null | undefined;
  readonly frame: FrameResult | null;
  readonly setMode: (mode: AnnotationMode) => M;
  readonly setOverlayOpacity: (value: number) => M;
  readonly setBrushSize: (value: number) => M;
  readonly setActiveLabelId: (id: string) => M;
  readonly openLabelDialog: M;
  readonly sectionAppearance?: "framed" | "rail" | undefined;
  /** Rendered after Mode and before Labels. Studio uses this for the Tool list. */
  readonly insertAfterMode?: View.Input<M, R> | undefined;
};

export type AnnotationControlRailProps<M = never, R = never> = AnnotationControlRailOptions<M, R>;

export function AnnotationControlRail<M, R = never>(
  h: Html.H<M>,
  options: AnnotationControlRailOptions<M, R>,
): View.Input<M, R> {
  const isRail = options.sectionAppearance === "rail";

  const chooseLabel = (label: AnnotationLabel): M => {
    if (options.mode === "classification") {
      const selected = options.annotation.current.classificationLabelId === label.id;
      return options.annotation.commit({
        classificationLabelId: selected ? null : label.id,
        mask: options.annotation.current.mask,
      });
    }
    return options.setActiveLabelId(label.id);
  };

  const renderModeControl = () =>
    AnnotationModeToggle(h, {
      class: "w-full",
      mode: options.mode,
      onModeChange: options.setMode,
    });

  const renderLabelControls = (): View.Input<M, R> => [
    ...options.labels.map((label, index) => {
      const selected =
        options.mode === "classification"
          ? options.annotation.current.classificationLabelId === label.id
          : options.activeLabelId === label.id;
      const shortcut = index < LABEL_SHORTCUT_LIMIT ? index + 1 : null;
      const colorStyle = labelColorStyle(label, selected);

      let button = h.button
        .key(label.id)
        .attr("aria-pressed", selected ? "true" : "false")
        .attr("type", "button")
        .attr("title", label.name)
        .disabled(!options.canEdit)
        .class(
          "relative flex h-8 w-full min-w-0 items-center justify-center border pr-9 pl-7 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50",
        )
        .on("click", () => chooseLabel(label));

      if (shortcut !== null) {
        button = button.attr("aria-keyshortcuts", `Shift+${shortcut}`);
      }
      if (colorStyle !== undefined) {
        button = button.attr("style", colorStyle);
      }

      return button.children(
        selected ? Icon(h, "check", { class: "absolute left-2 size-3.5" }) : undefined,
        h.span.class("truncate").children(label.name),
        shortcut !== null
          ? h.kbd
              .attr("aria-hidden", "true")
              .class(
                "pointer-events-none absolute right-1.5 flex h-4 items-center font-[inherit] text-[10px] font-medium leading-none text-current",
              )
              .children(`⇧${shortcut}`)
          : undefined,
      );
    }),
    Button(h, {
      class: "col-span-full w-full",
      disabled: !options.workspacePath,
      size: "sm",
      type: "button",
      variant: "outline",
      onPress: options.openLabelDialog,
    }).children("Edit labels"),
  ];

  const renderClearButton = () =>
    Button(h, {
      class: "w-full",
      disabled: options.mode !== "segmentation" || !options.canEdit,
      size: "sm",
      type: "button",
      variant: "outline",
    })
      .on("click", () => {
        if (!options.frame) return undefined;
        return options.annotation.commit({
          classificationLabelId: options.annotation.current.classificationLabelId,
          mask: createEmptyMask(options.frame.width, options.frame.height),
        });
      })
      .children("Clear");

  const renderUndoButton = () =>
    Button(h, {
      class: "w-full",
      disabled: !options.annotation.canUndo,
      size: "sm",
      type: "button",
      variant: "outline",
      onPress: options.annotation.undo,
    }).children("Undo");

  const renderRedoButton = () =>
    Button(h, {
      class: "w-full",
      disabled: !options.annotation.canRedo,
      size: "sm",
      type: "button",
      variant: "outline",
      onPress: options.annotation.redo,
    }).children("Redo");

  const renderDiscardButton = () =>
    Button(h, {
      class: "w-full",
      disabled: !options.annotation.dirty,
      size: "sm",
      type: "button",
      variant: "outline",
      onPress: options.annotation.discard,
    }).children("Discard");

  const renderBrushSliders = (): View.Input<M, R> => [
    AnnotationToolSlider(h, {
      key: "annotation-opacity",
      label: "Opacity",
      max: 0.95,
      min: 0.05,
      step: 0.01,
      value: options.overlayOpacity,
      valueLabel: `${Math.round(options.overlayOpacity * 100)}%`,
      onChange: options.setOverlayOpacity,
    }),
    AnnotationToolSlider(h, {
      key: "annotation-brush-size",
      label: "Brush Size",
      max: 32,
      min: 1,
      step: 1,
      value: options.brushSize,
      valueLabel: String(Math.round(options.brushSize)),
      onChange: (value) => options.setBrushSize(Math.round(value)),
    }),
  ];

  const keyPrefix = options.key ? `${options.key}-` : "";

  return [
    LabelShortcutListener(h, {
      key: `${keyPrefix}label-shortcuts`,
      props: {
        enabled: options.canEdit,
        labelCount: options.labels.length,
      },
      onEmit: {
        Pressed: ({ index }) => {
          const label = options.labels[index];
          return label ? chooseLabel(label) : undefined;
        },
      },
    }),
    PanelSection(h, {
      key: `${keyPrefix}mode`,
      appearance: options.sectionAppearance,
      title: "Mode",
      children: isRail ? RailControlStack(h).children(renderModeControl()) : renderModeControl(),
    }),
    ...(Array.isArray(options.insertAfterMode)
      ? options.insertAfterMode
      : [options.insertAfterMode]),
    PanelSection(h, {
      key: `${keyPrefix}labels`,
      appearance: options.sectionAppearance,
      contentClassName: isRail ? undefined : "grid grid-cols-2 gap-2",
      title: "Labels",
      children: isRail
        ? RailControlStack(h).children(renderLabelControls())
        : renderLabelControls(),
    }),
    PanelSection(h, {
      key: `${keyPrefix}edit`,
      appearance: options.sectionAppearance,
      contentClassName: isRail ? undefined : "grid grid-cols-2 gap-2",
      title: "Edit",
      children: isRail
        ? RailControlStack(h).children(
            RailActionPair(h, { label: "History" }).children(
              renderUndoButton(),
              renderRedoButton(),
            ),
            RailActionPair(h, { label: "Annotation cleanup" }).children(
              renderClearButton(),
              renderDiscardButton(),
            ),
          )
        : [renderUndoButton(), renderRedoButton(), renderClearButton(), renderDiscardButton()],
    }),
    options.mode === "segmentation"
      ? PanelSection(h, {
          key: `${keyPrefix}brush`,
          appearance: options.sectionAppearance,
          contentClassName: isRail ? undefined : "flex flex-col gap-3",
          title: "Brush",
          children: isRail
            ? RailControlStack(h).children(renderBrushSliders())
            : renderBrushSliders(),
        })
      : undefined,
  ];
}

import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { AlignGridShapeSchema, type AlignGridShape } from "@lisca/contracts";
import { Button } from "@lisca/ui/button";
import { cn } from "@lisca/ui/cn";
import { Field, FieldLabel } from "@lisca/ui/field";
import {
  AlignStateToggleIndicator,
  PanelSection,
  RailActionPair,
  RailControlStack,
  RailFieldPair,
} from "@lisca/ui/patterns";
import { Slider } from "@lisca/ui/slider";
import { Toggle } from "@lisca/ui/toggle";
import { clamp } from "@lisca/utils";
import { Schema } from "effect";

import {
  AlignDetectShapeToggle,
  AlignGridShapeToggle,
  type AlignDetectShape,
} from "./align-grid-shape-toggle";
import { AlignNumberInput } from "./align-number-input";

function formatDegrees(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Object.is(rounded, -0) ? 0 : rounded}°`;
}

const AlignDetectShapeSchema = Schema.Literals(["auto", "rect", "hex"]);
const SectionAppearanceSchema = Schema.Literals(["framed", "rail"]);
const RailPartSchema = Schema.Literals(["all", "grid", "geometry"]);

const AlignGridMessage = UiSchema.TaggedEnum({
  OverlayVisibleToggled: { visible: Schema.Boolean },
  ShapeSelected: { shape: AlignGridShapeSchema },
  DetectShapeSelected: { shape: AlignDetectShapeSchema },
  DetectGridClicked: {},
  RotationDraftChanged: { degrees: Schema.Number },
  RotationCommitted: { degrees: Schema.Number },
  OpacityDraftChanged: { opacity: Schema.Number },
  OpacityCommitted: { opacity: Schema.Number },
  SpacingACommitted: { value: Schema.Number },
  SpacingBCommitted: { value: Schema.Number },
  PatternWidthCommitted: { value: Schema.Number },
  PatternHeightCommitted: { value: Schema.Number },
  OffsetXCommitted: { value: Schema.Number },
  OffsetYCommitted: { value: Schema.Number },
  ResetClicked: {},
});

const AlignGridEvents = UiSchema.TaggedEnum({
  OverlayVisibleChanged: { visible: Schema.Boolean },
  ShapeChanged: { shape: AlignGridShapeSchema },
  RotationDegreesChanged: { degrees: Schema.Number },
  SpacingAChanged: { value: Schema.Number },
  SpacingBChanged: { value: Schema.Number },
  PatternWidthChanged: { value: Schema.Number },
  PatternHeightChanged: { value: Schema.Number },
  OffsetXChanged: { value: Schema.Number },
  OffsetYChanged: { value: Schema.Number },
  OverlayOpacityChanged: { opacity: Schema.Number },
  ResetClicked: {},
  DetectGridClicked: { shape: Schema.NullOr(AlignGridShapeSchema) },
});

const AlignGridComponent = Html.component({
  name: "LiscaAlignGrid",
  props: Schema.Struct({
    overlayVisible: Schema.Boolean,
    shape: AlignGridShapeSchema,
    rotationDegrees: Schema.Number,
    spacingA: Schema.Number,
    spacingB: Schema.Number,
    spacingMin: Schema.Number,
    patternWidth: Schema.Number,
    patternHeight: Schema.Number,
    patternMin: Schema.Number,
    offsetX: Schema.Number,
    offsetY: Schema.Number,
    offsetDisabled: Schema.optional(Schema.Boolean),
    overlayOpacity: Schema.Number,
    hasReset: Schema.Boolean,
    resetDisabled: Schema.Boolean,
    hasDetectGrid: Schema.Boolean,
    detecting: Schema.Boolean,
    detectReport: Schema.NullOr(Schema.String),
    detectLowConfidence: Schema.Boolean,
    disabled: Schema.Boolean,
    sectionTitle: Schema.String,
    sectionDescription: Schema.optional(Schema.String),
    sectionClassName: Schema.optional(Schema.String),
    sectionContentClassName: Schema.optional(Schema.String),
    sectionAppearance: Schema.optional(SectionAppearanceSchema),
    railPart: RailPartSchema,
  }),
  model: Schema.Struct({
    rotationDraft: Schema.NullOr(Schema.Number),
    syncedRotation: Schema.Number,
    overlayOpacityDraft: Schema.NullOr(Schema.Number),
    syncedOpacity: Schema.Number,
    detectShape: AlignDetectShapeSchema,
  }),
  message: AlignGridMessage,
  events: AlignGridEvents,
}).make({
  init: ($) =>
    $.set({
      rotationDraft: null,
      syncedRotation: $.props.rotationDegrees,
      overlayOpacityDraft: null,
      syncedOpacity: $.props.overlayOpacity,
      detectShape: "auto" as AlignDetectShape,
    }),
  update: {
    OverlayVisibleToggled: ($, { visible }) =>
      $.emit(AlignGridEvents.OverlayVisibleChanged({ visible })),
    ShapeSelected: ($, { shape }) => $.emit(AlignGridEvents.ShapeChanged({ shape })),
    DetectShapeSelected: ($, { shape }) => $.evolve({ detectShape: shape }),
    DetectGridClicked: ($) =>
      $.emit(
        AlignGridEvents.DetectGridClicked({
          shape: $.model.detectShape === "auto" ? null : $.model.detectShape,
        }),
      ),
    RotationDraftChanged: ($, { degrees }) =>
      $.evolve({
        rotationDraft: clamp(degrees, -180, 180),
        syncedRotation: $.props.rotationDegrees,
      }),
    RotationCommitted: ($, { degrees }) => {
      const clamped = clamp(degrees, -180, 180);
      return $.evolve({
        rotationDraft: null,
        syncedRotation: $.props.rotationDegrees,
      }).emit(AlignGridEvents.RotationDegreesChanged({ degrees: clamped }));
    },
    OpacityDraftChanged: ($, { opacity }) =>
      $.evolve({
        overlayOpacityDraft: clamp(opacity, 0, 1),
        syncedOpacity: $.props.overlayOpacity,
      }),
    OpacityCommitted: ($, { opacity }) => {
      const clamped = clamp(opacity, 0, 1);
      return $.evolve({
        overlayOpacityDraft: null,
        syncedOpacity: $.props.overlayOpacity,
      }).emit(AlignGridEvents.OverlayOpacityChanged({ opacity: clamped }));
    },
    SpacingACommitted: ($, { value }) => $.emit(AlignGridEvents.SpacingAChanged({ value })),
    SpacingBCommitted: ($, { value }) => $.emit(AlignGridEvents.SpacingBChanged({ value })),
    PatternWidthCommitted: ($, { value }) => $.emit(AlignGridEvents.PatternWidthChanged({ value })),
    PatternHeightCommitted: ($, { value }) =>
      $.emit(AlignGridEvents.PatternHeightChanged({ value })),
    OffsetXCommitted: ($, { value }) => $.emit(AlignGridEvents.OffsetXChanged({ value })),
    OffsetYCommitted: ($, { value }) => $.emit(AlignGridEvents.OffsetYChanged({ value })),
    ResetClicked: ($) => $.emit(AlignGridEvents.ResetClicked()),
  },
  view: (h, model) => {
    const props = h.props;
    const rotationDraft =
      model.rotationDraft !== null && model.syncedRotation === props.rotationDegrees
        ? model.rotationDraft
        : props.rotationDegrees;
    const overlayOpacityDraft =
      model.overlayOpacityDraft !== null && model.syncedOpacity === props.overlayOpacity
        ? model.overlayOpacityDraft
        : props.overlayOpacity;

    const showControl = Toggle(h, {
      ariaLabel: "Show grid overlay",
      class: "w-full justify-center text-xs",
      disabled: props.disabled,
      pressed: props.overlayVisible,
      size: "sm",
      variant: "outline",
      onToggle: ({ pressed }) => AlignGridMessage.OverlayVisibleToggled({ visible: pressed }),
    })
      .attr("data-instrument-state-toggle", "")
      .children(
        AlignStateToggleIndicator(h, { pressed: props.overlayVisible }),
        h.span.children("Show"),
      );

    const resetControl = Button(h, {
      class: "w-full justify-center text-xs",
      disabled: props.disabled || props.resetDisabled || !props.hasReset,
      size: "sm",
      type: "button",
      variant: "outline",
      onPress: AlignGridMessage.ResetClicked(),
    }).children("Reset");

    const renderOpacityControl = (showValue: boolean) =>
      Field(h, { class: "min-w-0 w-full" }).children(
        FieldLabel(h, {
          class: showValue ? "w-full justify-between gap-2" : undefined,
        }).children(
          h.span.children("Opacity"),
          showValue
            ? h.span
                .class("font-normal tabular-nums text-foreground")
                .children(`${Math.round(overlayOpacityDraft * 100)}%`)
            : undefined,
        ),
        Slider(h, {
          key: "grid-opacity",
          ariaLabel: "Grid opacity",
          class: "w-full pt-0.5",
          disabled: props.disabled,
          max: 1,
          min: 0,
          step: 0.01,
          value: overlayOpacityDraft,
          onValueChange: (value) => AlignGridMessage.OpacityDraftChanged({ opacity: value }),
          onValueCommitted: (value) => AlignGridMessage.OpacityCommitted({ opacity: value }),
        }),
      );

    const shapeControl = Field(h, { class: "min-w-0 w-full" }).children(
      FieldLabel(h).children("Grid shape"),
      AlignGridShapeToggle(h, {
        key: "grid-shape",
        disabled: props.disabled,
        shape: props.shape,
        onShapeChange: (shape) => AlignGridMessage.ShapeSelected({ shape }),
      }),
    );

    const detectControls = props.hasDetectGrid
      ? h.div.class("flex min-w-0 w-full flex-col gap-2").children(
          Button(h, {
            class: "w-full justify-center text-xs",
            disabled: props.disabled || props.detecting,
            size: "sm",
            type: "button",
            variant: "outline",
            onPress: AlignGridMessage.DetectGridClicked(),
          }).children(props.detecting ? "Detecting…" : "Auto-detect"),
          Field(h, { class: "min-w-0 w-full" }).children(
            FieldLabel(h).children("Detect shape"),
            AlignDetectShapeToggle(h, {
              key: "detect-shape",
              disabled: props.disabled || props.detecting,
              shape: model.detectShape,
              onShapeChange: (shape) => AlignGridMessage.DetectShapeSelected({ shape }),
            }),
          ),
          props.detectReport
            ? (() => {
                let p = h.p.class(
                  cn(
                    "text-xs leading-snug",
                    props.detectLowConfidence ? "text-warning-foreground" : "text-muted-foreground",
                  ),
                );
                if (props.detectLowConfidence) {
                  p = p.attr("role", "status");
                }
                return p.children(props.detectReport);
              })()
            : undefined,
        )
      : undefined;

    const renderGridControls = (rail: boolean) =>
      rail
        ? [
            RailActionPair(h, { label: "Grid visibility" }).children(showControl, resetControl),
            renderOpacityControl(true),
            shapeControl,
            detectControls,
          ]
        : [
            h.div.class("grid w-full grid-cols-2 gap-2").children(showControl, resetControl),
            renderOpacityControl(false),
            shapeControl,
            detectControls,
          ];

    const offsetFields = [
      Field(h, { class: "min-w-0 w-full" }).children(
        FieldLabel(h).children("Offset X"),
        AlignNumberInput(h, {
          key: "offset-x",
          label: "Offset X",
          disabled: props.offsetDisabled ?? props.disabled,
          step: "0.1",
          value: props.offsetX,
          onCommit: (value) => AlignGridMessage.OffsetXCommitted({ value }),
        }),
      ),
      Field(h, { class: "min-w-0 w-full" }).children(
        FieldLabel(h).children("Offset Y"),
        AlignNumberInput(h, {
          key: "offset-y",
          label: "Offset Y",
          disabled: props.offsetDisabled ?? props.disabled,
          step: "0.1",
          value: props.offsetY,
          onCommit: (value) => AlignGridMessage.OffsetYCommitted({ value }),
        }),
      ),
    ];

    const renderOffsetControls = (rail: boolean) =>
      rail
        ? RailFieldPair(h).children(...offsetFields)
        : h.div.class("grid grid-cols-2 gap-2").children(...offsetFields);

    const renderRotationControl = (showValue: boolean) =>
      Field(h, { class: "min-w-0 w-full" }).children(
        FieldLabel(h, {
          class: showValue ? "w-full justify-between gap-2" : undefined,
        }).children(
          h.span.children("Rotation"),
          showValue
            ? h.span
                .class("font-normal tabular-nums text-foreground")
                .children(formatDegrees(rotationDraft))
            : undefined,
        ),
        Slider(h, {
          key: "grid-rotation",
          ariaLabel: "Grid rotation",
          class: "w-full pt-0.5",
          disabled: props.disabled,
          max: 180,
          min: -180,
          step: 0.1,
          value: rotationDraft,
          onValueChange: (value) => AlignGridMessage.RotationDraftChanged({ degrees: value }),
          onValueCommitted: (value) => AlignGridMessage.RotationCommitted({ degrees: value }),
        }),
      );

    const spacingFields = [
      Field(h, { class: "min-w-0 w-full" }).children(
        FieldLabel(h).children("Spacing X"),
        AlignNumberInput(h, {
          key: "spacing-a",
          label: "Spacing X",
          disabled: props.disabled,
          min: props.spacingMin,
          value: props.spacingA,
          onCommit: (value) => AlignGridMessage.SpacingACommitted({ value }),
        }),
      ),
      Field(h, { class: "min-w-0 w-full" }).children(
        FieldLabel(h).children("Spacing Y"),
        AlignNumberInput(h, {
          key: "spacing-b",
          label: "Spacing Y",
          disabled: props.disabled,
          min: props.spacingMin,
          value: props.spacingB,
          onCommit: (value) => AlignGridMessage.SpacingBCommitted({ value }),
        }),
      ),
    ];

    const renderSpacingControls = (rail: boolean) =>
      rail
        ? RailFieldPair(h).children(...spacingFields)
        : h.div.class("grid grid-cols-2 gap-2").children(...spacingFields);

    const patternFields = [
      Field(h, { class: "min-w-0 w-full" }).children(
        FieldLabel(h).children("Pattern Width"),
        AlignNumberInput(h, {
          key: "pattern-width",
          label: "Pattern Width",
          disabled: props.disabled,
          min: props.patternMin,
          value: props.patternWidth,
          onCommit: (value) => AlignGridMessage.PatternWidthCommitted({ value }),
        }),
      ),
      Field(h, { class: "min-w-0 w-full" }).children(
        FieldLabel(h).children("Pattern Height"),
        AlignNumberInput(h, {
          key: "pattern-height",
          label: "Pattern Height",
          disabled: props.disabled,
          min: props.patternMin,
          value: props.patternHeight,
          onCommit: (value) => AlignGridMessage.PatternHeightCommitted({ value }),
        }),
      ),
    ];

    const renderPatternControls = (rail: boolean) =>
      rail
        ? RailFieldPair(h).children(...patternFields)
        : h.div.class("grid grid-cols-2 gap-2").children(...patternFields);

    const renderGeometryControls = (rail: boolean, toolOrder: boolean) =>
      toolOrder
        ? [
            renderOffsetControls(rail),
            renderRotationControl(rail),
            renderSpacingControls(rail),
            renderPatternControls(rail),
          ]
        : [
            renderRotationControl(rail),
            renderSpacingControls(rail),
            renderPatternControls(rail),
            renderOffsetControls(rail),
          ];

    if (props.sectionAppearance === "rail") {
      const gridSection =
        props.railPart !== "geometry"
          ? PanelSection(h, {
              key: "grid-section",
              appearance: "rail",
              class: props.sectionClassName,
              contentClassName: props.sectionContentClassName,
              description: props.sectionDescription,
              title: props.sectionTitle,
              children: RailControlStack(h).children(...renderGridControls(true)),
            })
          : undefined;

      const geometrySection =
        props.railPart !== "grid"
          ? PanelSection(h, {
              key: "geometry-section",
              appearance: "rail",
              class: props.sectionClassName,
              contentClassName: props.sectionContentClassName,
              title: "Geometry",
              children: RailControlStack(h).children(...renderGeometryControls(true, true)),
            })
          : undefined;

      if (gridSection && geometrySection) {
        return h.div.class("contents").children(gridSection, geometrySection);
      }
      return gridSection ?? geometrySection!;
    }

    return PanelSection(h, {
      key: "framed-grid-section",
      appearance: props.sectionAppearance,
      class: props.sectionClassName,
      contentClassName: props.sectionContentClassName,
      description: props.sectionDescription,
      title: props.sectionTitle,
      children: h.div
        .class("min-w-0 space-y-3")
        .children(...renderGridControls(false), ...renderGeometryControls(false, false)),
    });
  },
});

export type AlignGridOptions<M> = {
  readonly key?: string | undefined;
  readonly overlayVisible: boolean;
  readonly onOverlayVisibleChange: (visible: boolean) => M | undefined;

  readonly shape: AlignGridShape;
  readonly onShapeChange: (shape: AlignGridShape) => M | undefined;

  readonly rotationDegrees: number;
  readonly onRotationDegreesChange: (degrees: number) => M | undefined;

  readonly spacingA: number;
  readonly spacingB: number;
  readonly onSpacingAChange: (value: number) => M | undefined;
  readonly onSpacingBChange: (value: number) => M | undefined;
  readonly spacingMin?: number | undefined;

  readonly patternWidth: number;
  readonly patternHeight: number;
  readonly onPatternWidthChange: (value: number) => M | undefined;
  readonly onPatternHeightChange: (value: number) => M | undefined;
  readonly patternMin?: number | undefined;

  readonly offsetX: number;
  readonly offsetY: number;
  readonly onOffsetXChange: (value: number) => M | undefined;
  readonly onOffsetYChange: (value: number) => M | undefined;
  /** Offset fields only. Geometry stays editable when this is set. */
  readonly offsetDisabled?: boolean | undefined;

  readonly overlayOpacity: number;
  readonly onOverlayOpacityChange: (opacity: number) => M | undefined;

  readonly onReset?: M | undefined;
  readonly resetDisabled?: boolean | undefined;

  readonly detecting?: boolean | undefined;
  readonly detectReport?: string | null | undefined;
  readonly detectLowConfidence?: boolean | undefined;
  readonly onDetectGrid?: ((shape?: AlignGridShape) => M | undefined) | undefined;

  readonly disabled?: boolean | undefined;

  readonly sectionTitle?: string | undefined;
  readonly sectionDescription?: string | undefined;
  readonly sectionClassName?: string | undefined;
  readonly sectionContentClassName?: string | undefined;
  readonly sectionAppearance?: "framed" | "rail" | undefined;
  /** Rail placement can show Grid, Geometry, or both. Framed placement ignores this. */
  readonly railPart?: "all" | "grid" | "geometry" | undefined;
};

export type AlignGridProps<M = never> = AlignGridOptions<M>;

/**
 * Grid controls behind one interface. Framed placement keeps the established combined section;
 * instrument-rail placement groups visibility/shape under **Grid** and dimensions under
 * **Geometry** so both groups can collapse independently.
 */
export function AlignGrid<M>(h: Html.H<M>, options: AlignGridOptions<M>) {
  return AlignGridComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      overlayVisible: options.overlayVisible,
      shape: options.shape,
      rotationDegrees: options.rotationDegrees,
      spacingA: options.spacingA,
      spacingB: options.spacingB,
      spacingMin: options.spacingMin ?? 1,
      patternWidth: options.patternWidth,
      patternHeight: options.patternHeight,
      patternMin: options.patternMin ?? 1,
      offsetX: options.offsetX,
      offsetY: options.offsetY,
      ...(options.offsetDisabled !== undefined ? { offsetDisabled: options.offsetDisabled } : {}),
      overlayOpacity: options.overlayOpacity,
      hasReset: options.onReset !== undefined,
      resetDisabled: options.resetDisabled ?? false,
      hasDetectGrid: options.onDetectGrid !== undefined,
      detecting: options.detecting ?? false,
      detectReport: options.detectReport ?? null,
      detectLowConfidence: options.detectLowConfidence ?? false,
      disabled: options.disabled ?? false,
      sectionTitle: options.sectionTitle ?? "Grid",
      ...(options.sectionDescription !== undefined
        ? { sectionDescription: options.sectionDescription }
        : {}),
      ...(options.sectionClassName !== undefined
        ? { sectionClassName: options.sectionClassName }
        : {}),
      ...(options.sectionContentClassName !== undefined
        ? { sectionContentClassName: options.sectionContentClassName }
        : {}),
      ...(options.sectionAppearance !== undefined
        ? { sectionAppearance: options.sectionAppearance }
        : {}),
      railPart: options.railPart ?? "all",
    },
    onEmit: {
      OverlayVisibleChanged: ({ visible }) => options.onOverlayVisibleChange(visible),
      ShapeChanged: ({ shape }) => options.onShapeChange(shape),
      RotationDegreesChanged: ({ degrees }) => options.onRotationDegreesChange(degrees),
      SpacingAChanged: ({ value }) => options.onSpacingAChange(value),
      SpacingBChanged: ({ value }) => options.onSpacingBChange(value),
      PatternWidthChanged: ({ value }) => options.onPatternWidthChange(value),
      PatternHeightChanged: ({ value }) => options.onPatternHeightChange(value),
      OffsetXChanged: ({ value }) => options.onOffsetXChange(value),
      OffsetYChanged: ({ value }) => options.onOffsetYChange(value),
      OverlayOpacityChanged: ({ opacity }) => options.onOverlayOpacityChange(opacity),
      ResetClicked: () => options.onReset,
      DetectGridClicked: ({ shape }) => options.onDetectGrid?.(shape ?? undefined),
    },
  });
}

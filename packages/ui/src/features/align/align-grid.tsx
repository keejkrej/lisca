import type { AlignGridShape } from "@lisca/contracts";
import { clamp } from "@lisca/utils";
import { createEffect, createSignal, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Toggle } from "../../components/ui/toggle";

import { Slider } from "../../components/ui/slider";
import { PanelSection } from "../../shell/regions/panel-section";
import {
  RailActionPair,
  RailControlStack,
  RailFieldPair,
} from "../../shell/regions/rail-control-layout";
import { AlignGridShapeToggle } from "./align-grid-shape-toggle";
import { AlignStateToggleIndicator } from "./align-state-toggle-indicator";

function AlignNumberInput(props: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  disabled?: boolean;
  min?: number;
  step?: string;
}) {
  const [draft, setDraft] = createSignal(formatNumber(props.value));
  let skipBlurCommit = false;

  createEffect(() => {
    setDraft(formatNumber(props.value));
  });

  const revert = () => setDraft(formatNumber(props.value));
  const commit = () => {
    if (skipBlurCommit) {
      skipBlurCommit = false;
      revert();
      return;
    }
    const trimmed = draft().trim();
    const value = trimmed === "" ? NaN : Number(trimmed);
    if (!Number.isFinite(value) || (props.min != null && value < props.min)) {
      revert();
      return;
    }
    setDraft(formatNumber(value));
    props.onCommit(value);
  };

  return (
    <Input
      autocomplete="off"
      aria-label={props.label}
      disabled={props.disabled}
      min={props.min}
      name={props.label.toLowerCase().replaceAll(" ", "-")}
      size="sm"
      step={props.step ?? "any"}
      type="number"
      value={draft()}
      onBlur={commit}
      onInput={(e) => setDraft(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          skipBlurCommit = true;
          revert();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

function formatDegrees(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${Object.is(rounded, -0) ? 0 : rounded}°`;
}

export type AlignGridProps = {
  overlayVisible: boolean;
  onOverlayVisibleChange: (visible: boolean) => void;

  shape: AlignGridShape;
  onShapeChange: (shape: AlignGridShape) => void;

  rotationDegrees: number;
  onRotationDegreesChange: (degrees: number) => void;

  spacingA: number;
  spacingB: number;
  onSpacingAChange: (value: number) => void;
  onSpacingBChange: (value: number) => void;
  spacingMin?: number;

  patternWidth: number;
  patternHeight: number;
  onPatternWidthChange: (value: number) => void;
  onPatternHeightChange: (value: number) => void;
  patternMin?: number;

  offsetX: number;
  offsetY: number;
  onOffsetXChange: (value: number) => void;
  onOffsetYChange: (value: number) => void;

  overlayOpacity: number;
  onOverlayOpacityChange: (opacity: number) => void;

  onReset?: () => void;
  resetDisabled?: boolean;

  disabled?: boolean;

  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  sectionAppearance?: "framed" | "rail";
};

/**
 * Grid controls behind one interface. Framed placement keeps the established combined section;
 * instrument-rail placement groups visibility/shape under **Grid** and dimensions under
 * **Geometry** so both groups can collapse independently.
 */
export function AlignGrid(props: AlignGridProps) {
  const spacingMin = () => props.spacingMin ?? 1;
  const patternMin = () => props.patternMin ?? 1;
  const [rotationDraft, setRotationDraft] = createSignal(props.rotationDegrees);
  const [overlayOpacityDraft, setOverlayOpacityDraft] = createSignal(props.overlayOpacity);

  createEffect(() => {
    setRotationDraft(props.rotationDegrees);
  });

  createEffect(() => {
    setOverlayOpacityDraft(props.overlayOpacity);
  });

  const ShowControl = () => (
    <Toggle
      aria-label="Show grid overlay"
      aria-pressed={props.overlayVisible}
      class="w-full justify-center text-xs"
      data-instrument-state-toggle=""
      disabled={props.disabled}
      pressed={props.overlayVisible}
      size="sm"
      variant="outline"
      onChange={props.onOverlayVisibleChange}
    >
      <AlignStateToggleIndicator pressed={props.overlayVisible} />
      <span>Show</span>
    </Toggle>
  );

  const ResetControl = () => (
    <Button
      class="w-full justify-center text-xs"
      disabled={props.disabled || props.resetDisabled || !props.onReset}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => props.onReset?.()}
    >
      Reset
    </Button>
  );

  const OpacityControl = (controlProps: { showValue?: boolean }) => (
    <Field class="min-w-0 w-full">
      <FieldLabel class={controlProps.showValue ? "w-full justify-between gap-2" : undefined}>
        <span>Opacity</span>
        <Show when={controlProps.showValue}>
          <span class="font-normal tabular-nums text-foreground">
            {Math.round(overlayOpacityDraft() * 100)}%
          </span>
        </Show>
      </FieldLabel>
      <Slider
        aria-label="Grid opacity"
        class="w-full pt-0.5"
        disabled={props.disabled}
        max={1}
        min={0}
        step={0.01}
        value={overlayOpacityDraft()}
        onValueChange={(value) => setOverlayOpacityDraft(clamp(value, 0, 1))}
        onValueCommitted={(value) => {
          const opacity = clamp(value, 0, 1);
          setOverlayOpacityDraft(opacity);
          props.onOverlayOpacityChange(opacity);
        }}
      />
    </Field>
  );

  const ShapeControl = () => (
    <Field class="min-w-0 w-full">
      <FieldLabel>Grid shape</FieldLabel>
      <AlignGridShapeToggle
        disabled={props.disabled}
        shape={props.shape}
        onShapeChange={props.onShapeChange}
      />
    </Field>
  );

  const GridControls = (controlProps: { rail?: boolean }) =>
    controlProps.rail ? (
      <>
        <RailActionPair label="Grid visibility">
          <ShowControl />
          <ResetControl />
        </RailActionPair>
        <OpacityControl showValue />
        <ShapeControl />
      </>
    ) : (
      <>
        <div class="grid w-full grid-cols-2 gap-2">
          <ShowControl />
          <ResetControl />
        </div>
        <OpacityControl />
        <ShapeControl />
      </>
    );

  const OffsetFields = () => (
    <>
      <Field class="min-w-0 w-full">
        <FieldLabel>Offset X</FieldLabel>
        <AlignNumberInput
          label="Offset X"
          disabled={props.disabled}
          step="0.1"
          value={props.offsetX}
          onCommit={props.onOffsetXChange}
        />
      </Field>
      <Field class="min-w-0 w-full">
        <FieldLabel>Offset Y</FieldLabel>
        <AlignNumberInput
          label="Offset Y"
          disabled={props.disabled}
          step="0.1"
          value={props.offsetY}
          onCommit={props.onOffsetYChange}
        />
      </Field>
    </>
  );

  const OffsetControls = (controlProps: { rail?: boolean }) =>
    controlProps.rail ? (
      <RailFieldPair>
        <OffsetFields />
      </RailFieldPair>
    ) : (
      <div class="grid grid-cols-2 gap-2">
        <OffsetFields />
      </div>
    );

  const RotationControl = (controlProps: { showValue?: boolean }) => (
    <Field class="min-w-0 w-full">
      <FieldLabel class={controlProps.showValue ? "w-full justify-between gap-2" : undefined}>
        <span>Rotation</span>
        <Show when={controlProps.showValue}>
          <span class="font-normal tabular-nums text-foreground">
            {formatDegrees(rotationDraft())}
          </span>
        </Show>
      </FieldLabel>
      <Slider
        aria-label="Grid rotation"
        class="w-full pt-0.5"
        disabled={props.disabled}
        max={180}
        min={-180}
        step={0.1}
        value={rotationDraft()}
        onValueChange={(value) => setRotationDraft(clamp(value, -180, 180))}
        onValueCommitted={(value) => {
          const degrees = clamp(value, -180, 180);
          setRotationDraft(degrees);
          props.onRotationDegreesChange(degrees);
        }}
      />
    </Field>
  );

  const SpacingFields = () => (
    <>
      <Field class="min-w-0 w-full">
        <FieldLabel>Spacing X</FieldLabel>
        <AlignNumberInput
          label="Spacing X"
          disabled={props.disabled}
          min={spacingMin()}
          value={props.spacingA}
          onCommit={props.onSpacingAChange}
        />
      </Field>
      <Field class="min-w-0 w-full">
        <FieldLabel>Spacing Y</FieldLabel>
        <AlignNumberInput
          label="Spacing Y"
          disabled={props.disabled}
          min={spacingMin()}
          value={props.spacingB}
          onCommit={props.onSpacingBChange}
        />
      </Field>
    </>
  );

  const SpacingControls = (controlProps: { rail?: boolean }) =>
    controlProps.rail ? (
      <RailFieldPair>
        <SpacingFields />
      </RailFieldPair>
    ) : (
      <div class="grid grid-cols-2 gap-2">
        <SpacingFields />
      </div>
    );

  const PatternFields = () => (
    <>
      <Field class="min-w-0 w-full">
        <FieldLabel>Pattern Width</FieldLabel>
        <AlignNumberInput
          label="Pattern Width"
          disabled={props.disabled}
          min={patternMin()}
          value={props.patternWidth}
          onCommit={props.onPatternWidthChange}
        />
      </Field>
      <Field class="min-w-0 w-full">
        <FieldLabel>Pattern Height</FieldLabel>
        <AlignNumberInput
          label="Pattern Height"
          disabled={props.disabled}
          min={patternMin()}
          value={props.patternHeight}
          onCommit={props.onPatternHeightChange}
        />
      </Field>
    </>
  );

  const PatternControls = (controlProps: { rail?: boolean }) =>
    controlProps.rail ? (
      <RailFieldPair>
        <PatternFields />
      </RailFieldPair>
    ) : (
      <div class="grid grid-cols-2 gap-2">
        <PatternFields />
      </div>
    );

  const GeometryControls = (controlProps: { toolOrder?: boolean; rail?: boolean }) =>
    controlProps.toolOrder ? (
      <>
        <OffsetControls rail={controlProps.rail} />
        <RotationControl showValue={controlProps.rail} />
        <SpacingControls rail={controlProps.rail} />
        <PatternControls rail={controlProps.rail} />
      </>
    ) : (
      <>
        <RotationControl showValue={controlProps.rail} />
        <SpacingControls rail={controlProps.rail} />
        <PatternControls rail={controlProps.rail} />
        <OffsetControls rail={controlProps.rail} />
      </>
    );

  return (
    <Show
      when={props.sectionAppearance === "rail"}
      fallback={
        <PanelSection
          appearance={props.sectionAppearance}
          class={props.sectionClassName}
          contentClassName={props.sectionContentClassName}
          description={props.sectionDescription}
          title={props.sectionTitle ?? "Grid"}
        >
          <div class="min-w-0 space-y-3">
            <GridControls />
            <GeometryControls />
          </div>
        </PanelSection>
      }
    >
      <>
        <PanelSection
          appearance="rail"
          class={props.sectionClassName}
          contentClassName={props.sectionContentClassName}
          description={props.sectionDescription}
          title={props.sectionTitle ?? "Grid"}
        >
          <RailControlStack>
            <GridControls rail />
          </RailControlStack>
        </PanelSection>
        <PanelSection
          appearance="rail"
          class={props.sectionClassName}
          contentClassName={props.sectionContentClassName}
          title="Geometry"
        >
          <RailControlStack>
            <GeometryControls rail toolOrder />
          </RailControlStack>
        </PanelSection>
      </>
    </Show>
  );
}

import type { AlignGridShape } from "@lisca/contracts";
import { clamp } from "@lisca/utils";
import { createEffect, createSignal } from "solid-js";

import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Toggle } from "../../components/ui/toggle";

import { Slider } from "../../components/ui/slider";
import { Section } from "../../shell/regions/section";
import { AlignGridShapeToggle } from "./align-grid-shape-toggle";

function AlignNumberInput(props: {
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
      disabled={props.disabled}
      min={props.min}
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

export type AlignGridProps = {
  overlayVisible: boolean;
  onOverlayVisibleChange: (visible: boolean) => void;

  shape: AlignGridShape;
  onShapeChange: (shape: AlignGridShape) => void;

  rotationDegrees: number;
  onRotationDegreesChange: (degrees: number) => void;

  vectorA: number;
  vectorB: number;
  onVectorAChange: (value: number) => void;
  onVectorBChange: (value: number) => void;
  vectorMin?: number;

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
};

/**
 * Grid controls in a {@link Section} card: overlay row (**Show** / **Reset**), **Opacity**, then
 * shape toggle, rotation, vectors A/B, pattern width/height, offsets.
 */
export function AlignGrid(props: AlignGridProps) {
  const vectorMin = () => props.vectorMin ?? 1;
  const patternMin = () => props.patternMin ?? 1;
  const [rotationDraft, setRotationDraft] = createSignal(props.rotationDegrees);
  const [overlayOpacityDraft, setOverlayOpacityDraft] = createSignal(props.overlayOpacity);

  createEffect(() => {
    setRotationDraft(props.rotationDegrees);
  });

  createEffect(() => {
    setOverlayOpacityDraft(props.overlayOpacity);
  });

  return (
    <Section
      contentClassName={props.sectionContentClassName}
      description={props.sectionDescription}
      title={props.sectionTitle ?? "Grid"}
      class={props.sectionClassName}
    >
      <div class="min-w-0 space-y-3">
        <div class="grid w-full grid-cols-2 gap-2">
          <Toggle
            aria-label="Show grid overlay"
            aria-pressed={props.overlayVisible}
            class="w-full justify-center text-xs"
            disabled={props.disabled}
            pressed={props.overlayVisible}
            size="sm"
            variant="outline"
            onChange={props.onOverlayVisibleChange}
          >
            Show
          </Toggle>
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
        </div>

        <Field class="min-w-0 w-full">
          <FieldLabel>Opacity</FieldLabel>
          <Slider
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

        <Field class="min-w-0 w-full">
          <FieldLabel>Grid shape</FieldLabel>
          <AlignGridShapeToggle
            disabled={props.disabled}
            shape={props.shape}
            onShapeChange={props.onShapeChange}
          />
        </Field>

        <Field class="min-w-0 w-full">
          <FieldLabel>Rotation</FieldLabel>
          <Slider
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

        <div class="grid grid-cols-2 gap-2">
          <Field class="min-w-0 w-full">
            <FieldLabel>Vector A</FieldLabel>
            <AlignNumberInput
              disabled={props.disabled}
              min={vectorMin()}
              value={props.vectorA}
              onCommit={props.onVectorAChange}
            />
          </Field>
          <Field class="min-w-0 w-full">
            <FieldLabel>Vector B</FieldLabel>
            <AlignNumberInput
              disabled={props.disabled}
              min={vectorMin()}
              value={props.vectorB}
              onCommit={props.onVectorBChange}
            />
          </Field>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <Field class="min-w-0 w-full">
            <FieldLabel>Pattern Width</FieldLabel>
            <AlignNumberInput
              disabled={props.disabled}
              min={patternMin()}
              value={props.patternWidth}
              onCommit={props.onPatternWidthChange}
            />
          </Field>
          <Field class="min-w-0 w-full">
            <FieldLabel>Pattern Height</FieldLabel>
            <AlignNumberInput
              disabled={props.disabled}
              min={patternMin()}
              value={props.patternHeight}
              onCommit={props.onPatternHeightChange}
            />
          </Field>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <Field class="min-w-0 w-full">
            <FieldLabel>Offset X</FieldLabel>
            <AlignNumberInput
              disabled={props.disabled}
              step="0.1"
              value={props.offsetX}
              onCommit={props.onOffsetXChange}
            />
          </Field>
          <Field class="min-w-0 w-full">
            <FieldLabel>Offset Y</FieldLabel>
            <AlignNumberInput
              disabled={props.disabled}
              step="0.1"
              value={props.offsetY}
              onCommit={props.onOffsetYChange}
            />
          </Field>
        </div>
      </div>
    </Section>
  );
}
"use client";

import { clamp } from "@lisca/utils";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";

import { Slider } from "../../components/ui/slider";
import type { NavigationOption, NavigationValue } from "../navigation/frame-navigation";
import { Section } from "../../shell/regions/section";

function AlignNumberInput(props: {
  value: number;
  onCommit: (value: number) => void;
  disabled?: boolean;
  min?: number;
  step?: string;
}) {
  const [draft, setDraft] = useState(formatNumber(props.value));
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    setDraft(formatNumber(props.value));
  }, [props.value]);

  const revert = () => setDraft(formatNumber(props.value));
  const commit = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      revert();
      return;
    }
    const trimmed = draft.trim();
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
      value={draft}
      onBlur={commit}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          skipBlurCommitRef.current = true;
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

export type AlignGridProps<TShape extends NavigationValue = string> = {
  overlayVisible: boolean;
  onOverlayVisibleChange: (visible: boolean) => void;

  shape: TShape;
  shapeOptions: readonly NavigationOption<TShape>[];
  onShapeChange: (shape: TShape) => void;

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
 * Grid controls in a {@link Section} card: overlay row (**Hide** / **Show** / **Reset**), **Opacity**, then
 * shape select, rotation, vectors A/B, pattern width/height, offsets.
 */
export function AlignGrid<TShape extends NavigationValue = string>(props: AlignGridProps<TShape>) {
  const {
    overlayVisible,
    onOverlayVisibleChange,
    shape,
    shapeOptions,
    onShapeChange,
    rotationDegrees,
    onRotationDegreesChange,
    vectorA,
    vectorB,
    onVectorAChange,
    onVectorBChange,
    vectorMin = 1,
    patternWidth,
    patternHeight,
    onPatternWidthChange,
    onPatternHeightChange,
    patternMin = 1,
    offsetX,
    offsetY,
    onOffsetXChange,
    onOffsetYChange,
    overlayOpacity,
    onOverlayOpacityChange,
    onReset,
    resetDisabled,
    disabled,
    sectionTitle = "Grid",
    sectionDescription,
    sectionClassName,
    sectionContentClassName,
  } = props;

  const [rotationDraft, setRotationDraft] = useState(rotationDegrees);
  const [overlayOpacityDraft, setOverlayOpacityDraft] = useState(overlayOpacity);

  useEffect(() => {
    setRotationDraft(rotationDegrees);
  }, [rotationDegrees]);

  useEffect(() => {
    setOverlayOpacityDraft(overlayOpacity);
  }, [overlayOpacity]);

  return (
    <Section
      contentClassName={sectionContentClassName}
      description={sectionDescription}
      title={sectionTitle}
      className={sectionClassName}
    >
      <div className="min-w-0 space-y-3">
        <Field className="min-w-0 w-full">
          <FieldLabel>Overlay</FieldLabel>
          <Button
            className="h-8 w-full justify-center px-3 text-xs"
            disabled={disabled || resetDisabled || !onReset}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onReset?.()}
          >
            Reset
          </Button>
          <ToggleGroup
            className="w-full min-w-0"
            disabled={disabled}
            multiple={false}
            size="sm"
            value={[overlayVisible ? "show" : "hide"]}
            variant="outline"
            onValueChange={(next) => {
              const value = next[0];
              if (value === "hide") onOverlayVisibleChange(false);
              if (value === "show") onOverlayVisibleChange(true);
            }}
          >
            <ToggleGroupItem className="min-w-0 flex-1 px-2 text-xs" value="hide">
              Hide
            </ToggleGroupItem>
            <ToggleGroupItem className="min-w-0 flex-1 px-2 text-xs" value="show">
              Show
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <Field className="min-w-0 w-full">
          <FieldLabel>Opacity</FieldLabel>
          <Slider
            className="w-full pt-0.5"
            disabled={disabled}
            max={1}
            min={0}
            step={0.01}
            value={overlayOpacityDraft}
            onValueChange={(value) => setOverlayOpacityDraft(clamp(value, 0, 1))}
            onValueCommitted={(value) => {
              const opacity = clamp(value, 0, 1);
              setOverlayOpacityDraft(opacity);
              onOverlayOpacityChange(opacity);
            }}
          />
        </Field>

        <Field className="min-w-0 w-full">
          <FieldLabel>Grid shape</FieldLabel>
          <Select<TShape>
            disabled={disabled}
            items={[...shapeOptions]}
            modal={false}
            value={shape}
            onValueChange={(next) => next != null && onShapeChange(next)}
          >
            <SelectTrigger className="min-w-0 text-sm" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {shapeOptions.map((option) => (
                <SelectItem key={String(option.value)} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field className="min-w-0 w-full">
          <FieldLabel>Rotation</FieldLabel>
          <Slider
            className="w-full pt-0.5"
            disabled={disabled}
            max={180}
            min={-180}
            step={0.1}
            value={rotationDraft}
            onValueChange={(value) => setRotationDraft(clamp(value, -180, 180))}
            onValueCommitted={(value) => {
              const degrees = clamp(value, -180, 180);
              setRotationDraft(degrees);
              onRotationDegreesChange(degrees);
            }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field className="min-w-0 w-full">
            <FieldLabel>Vector A</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              min={vectorMin}
              value={vectorA}
              onCommit={onVectorAChange}
            />
          </Field>
          <Field className="min-w-0 w-full">
            <FieldLabel>Vector B</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              min={vectorMin}
              value={vectorB}
              onCommit={onVectorBChange}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field className="min-w-0 w-full">
            <FieldLabel>Pattern Width</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              min={patternMin}
              value={patternWidth}
              onCommit={onPatternWidthChange}
            />
          </Field>
          <Field className="min-w-0 w-full">
            <FieldLabel>Pattern Height</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              min={patternMin}
              value={patternHeight}
              onCommit={onPatternHeightChange}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field className="min-w-0 w-full">
            <FieldLabel>Offset X</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              step="0.1"
              value={offsetX}
              onCommit={onOffsetXChange}
            />
          </Field>
          <Field className="min-w-0 w-full">
            <FieldLabel>Offset Y</FieldLabel>
            <AlignNumberInput
              disabled={disabled}
              step="0.1"
              value={offsetY}
              onCommit={onOffsetYChange}
            />
          </Field>
        </div>
      </div>
    </Section>
  );
}

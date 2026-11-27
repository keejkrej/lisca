import type { Html } from "@effect/ui/html";
import type { AlignDrift } from "@lisca/contracts";
import { Button } from "@lisca/ui/button";
import { Field, FieldLabel } from "@lisca/ui/field";
import { PanelSection, RailActionPair, RailControlStack, RailFieldPair } from "@lisca/ui/patterns";
import { interpolateAlignDrift } from "@lisca/utils";

import { AlignNumberInput } from "./align-number-input";

export type AlignDriftRailOptions<M> = {
  readonly key?: string | undefined;
  readonly drift: AlignDrift | null;
  readonly time: number;
  readonly times?: readonly number[] | undefined;
  readonly frame?: { readonly width: number; readonly height: number } | null | undefined;
  readonly assayDefaultTime: number | null;
  readonly disabled?: boolean | undefined;
  readonly onDeltaChange: (dx: number, dy: number) => M | undefined;
  readonly onSetKeyframe: M;
  readonly onClearKeyframe: M;
  readonly onClearDrift: M;
  readonly onSetReference: M;
};

export type AlignDriftRailProps<M = never> = AlignDriftRailOptions<M>;

export function AlignDriftRail<M>(h: Html.H<M>, options: AlignDriftRailOptions<M>) {
  const disabled = options.disabled ?? false;
  const pins = options.drift?.keyframes ?? [];
  const delta = interpolateAlignDrift(options.drift, options.time);
  const hasPin = pins.some((pin) => pin.time === options.time);

  const commitDelta = (axis: "x" | "y", entered: number): M | undefined => {
    if (disabled) return undefined;
    const next = axis === "x" ? { dx: entered, dy: delta.dy } : { dx: delta.dx, dy: entered };
    if (next.dx === delta.dx && next.dy === delta.dy) return undefined;
    return options.onDeltaChange(next.dx, next.dy);
  };

  const missingTime =
    options.times != null && pins.some((pin) => !options.times!.includes(pin.time));
  const oversized = (() => {
    const frame = options.frame;
    if (frame == null) return false;
    const tooBig = (dx: number, dy: number) =>
      Math.abs(dx) > frame.width || Math.abs(dy) > frame.height;
    if (pins.some((pin) => tooBig(pin.dx, pin.dy))) return true;
    return tooBig(delta.dx, delta.dy);
  })();

  const warningParts: string[] = [];
  if (missingTime) warningParts.push("A keyframe time is not in this scan.");
  if (oversized) warningParts.push("A correction is larger than the frame.");
  const warning = warningParts.join(" ");

  const buttonClass = "w-full justify-center text-xs";

  return PanelSection(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    appearance: "rail",
    title: "Drift",
    children: RailControlStack(h).children(
      RailFieldPair(h).children(
        Field(h, { class: "min-w-0 w-full" }).children(
          FieldLabel(h).children("dx"),
          AlignNumberInput(h, {
            key: "drift-dx",
            label: "dx",
            disabled,
            step: "0.1",
            value: delta.dx,
            onCommit: (dx) => commitDelta("x", dx),
          }),
        ),
        Field(h, { class: "min-w-0 w-full" }).children(
          FieldLabel(h).children("dy"),
          AlignNumberInput(h, {
            key: "drift-dy",
            label: "dy",
            disabled,
            step: "0.1",
            value: delta.dy,
            onCommit: (dy) => commitDelta("y", dy),
          }),
        ),
      ),
      warning ? h.p.class("text-xs text-destructive").children(warning) : undefined,
      RailActionPair(h, { label: "Drift record" }).children(
        Button(h, {
          class: buttonClass,
          disabled: disabled || options.drift?.referenceTime === options.time,
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: options.onSetReference,
        }).children("Set reference"),
        Button(h, {
          class: buttonClass,
          disabled: disabled || pins.length === 0,
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: options.onClearDrift,
        }).children("Clear drift"),
      ),
      RailActionPair(h, { label: "This time" }).children(
        Button(h, {
          class: buttonClass,
          disabled:
            disabled || (options.drift?.referenceTime == null && options.assayDefaultTime == null),
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: options.onSetKeyframe,
        }).children("Set keyframe"),
        Button(h, {
          class: buttonClass,
          disabled: disabled || !hasPin,
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: options.onClearKeyframe,
        }).children("Clear keyframe"),
      ),
    ),
  });
}

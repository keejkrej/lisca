import type { AlignDrift } from "@lisca/contracts";
import { interpolateAlignDrift } from "@lisca/utils";
import { Show } from "solid-js";

import { Button } from "@lisca/ui/button";
import { Field, FieldLabel } from "@lisca/ui/field";
import { PanelSection } from "@lisca/ui/patterns";
import { RailActionPair, RailControlStack, RailFieldPair } from "@lisca/ui/patterns";

import { AlignNumberInput } from "./align-number-input";

export type AlignDriftRailProps = {
  drift: AlignDrift | null;
  time: number;
  times?: readonly number[];
  frame?: { width: number; height: number } | null;
  assayDefaultTime: number | null;
  disabled?: boolean;
  onDeltaChange: (dx: number, dy: number) => void;
  onSetKeyframe: () => void;
  onClearKeyframe: () => void;
  onClearDrift: () => void;
  onSetReference: () => void;
};

export function AlignDriftRail(props: AlignDriftRailProps) {
  const disabled = () => props.disabled ?? false;
  const pins = () => props.drift?.keyframes ?? [];
  const delta = () => interpolateAlignDrift(props.drift, props.time);
  const hasPin = () => pins().some((pin) => pin.time === props.time);
  const commitDelta = (axis: "x" | "y", entered: number) => {
    if (disabled()) return;
    const current = delta();
    const next = axis === "x" ? { dx: entered, dy: current.dy } : { dx: current.dx, dy: entered };
    if (next.dx === current.dx && next.dy === current.dy) return;
    props.onDeltaChange(next.dx, next.dy);
  };
  const missingTime = () => {
    const times = props.times;
    if (times == null) return false;
    return pins().some((pin) => !times.includes(pin.time));
  };
  const oversized = () => {
    const frame = props.frame;
    if (frame == null) return false;
    const tooBig = (dx: number, dy: number) =>
      Math.abs(dx) > frame.width || Math.abs(dy) > frame.height;
    if (pins().some((pin) => tooBig(pin.dx, pin.dy))) return true;
    const current = delta();
    return tooBig(current.dx, current.dy);
  };
  const warning = () => {
    const parts: string[] = [];
    if (missingTime()) parts.push("A keyframe time is not in this scan.");
    if (oversized()) parts.push("A correction is larger than the frame.");
    return parts.join(" ");
  };
  const buttonClass = "w-full justify-center text-xs";

  return (
    <PanelSection appearance="rail" title="Drift">
      <RailControlStack>
        <RailFieldPair>
          <Field class="min-w-0 w-full">
            <FieldLabel>dx</FieldLabel>
            <AlignNumberInput
              label="dx"
              disabled={disabled()}
              step="0.1"
              value={delta().dx}
              onCommit={(dx) => commitDelta("x", dx)}
            />
          </Field>
          <Field class="min-w-0 w-full">
            <FieldLabel>dy</FieldLabel>
            <AlignNumberInput
              label="dy"
              disabled={disabled()}
              step="0.1"
              value={delta().dy}
              onCommit={(dy) => commitDelta("y", dy)}
            />
          </Field>
        </RailFieldPair>
        <Show when={warning()}>
          <p class="text-xs text-destructive">{warning()}</p>
        </Show>
        <RailActionPair label="Drift record">
          <Button
            class={buttonClass}
            disabled={disabled() || props.drift?.referenceTime === props.time}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => props.onSetReference()}
          >
            Set reference
          </Button>
          <Button
            class={buttonClass}
            disabled={disabled() || pins().length === 0}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => props.onClearDrift()}
          >
            Clear drift
          </Button>
        </RailActionPair>
        <RailActionPair label="This time">
          <Button
            class={buttonClass}
            disabled={
              disabled() || (props.drift?.referenceTime == null && props.assayDefaultTime == null)
            }
            size="sm"
            type="button"
            variant="outline"
            onClick={() => props.onSetKeyframe()}
          >
            Set keyframe
          </Button>
          <Button
            class={buttonClass}
            disabled={disabled() || !hasPin()}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => props.onClearKeyframe()}
          >
            Clear keyframe
          </Button>
        </RailActionPair>
      </RailControlStack>
    </PanelSection>
  );
}

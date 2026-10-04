import type { AlignDrift } from "@lisca/contracts";
import { formatSelectedAxisValueLabel, interpolateAlignDrift } from "@lisca/utils";
import { Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { PanelSection } from "../../shell/regions/panel-section";
import { RailActionPair, RailControlStack } from "../../shell/regions/rail-control-layout";

export type AlignDriftRailProps = {
  drift: AlignDrift | null;
  time: number;
  times?: readonly number[];
  timeLabels?: readonly string[];
  frame?: { width: number; height: number } | null;
  assayDefaultTime: number | null;
  disabled?: boolean;
  onSetKeyframe: () => void;
  onClearKeyframe: () => void;
  onClearDrift: () => void;
  onSetReference: () => void;
};

function formatDelta(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(1);
}

function axisLabel(
  times: readonly number[] | undefined,
  time: number,
  timeLabels: readonly string[] | undefined,
): string {
  return formatSelectedAxisValueLabel(times, time, timeLabels) ?? String(time);
}

export function AlignDriftRail(props: AlignDriftRailProps) {
  const disabled = () => props.disabled ?? false;
  const pins = () => props.drift?.keyframes ?? [];
  const delta = () => interpolateAlignDrift(props.drift, props.time);
  const hasPin = () => pins().some((pin) => pin.time === props.time);
  const quiet = () => {
    const drift = props.drift;
    if (drift == null || drift.keyframes.length === 0) return true;
    if (drift.keyframes.some((pin) => pin.dx !== 0 || pin.dy !== 0)) return false;
    const current = interpolateAlignDrift(drift, props.time);
    return current.dx === 0 && current.dy === 0;
  };
  const timeLabel = () => axisLabel(props.times, props.time, props.timeLabels);
  const referenceLabel = () => {
    const time = props.drift?.referenceTime;
    if (time == null) return null;
    return axisLabel(props.times, time, props.timeLabels);
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
    <PanelSection
      appearance="rail"
      description="The saved correction is applied when the position is cropped."
      title="Drift"
    >
      <RailControlStack>
        <Show
          when={quiet()}
          fallback={
            <p class="text-xs tabular-nums">
              {`dx ${formatDelta(delta().dx)}, dy ${formatDelta(delta().dy)} · ${pins().length} ${
                pins().length === 1 ? "keyframe" : "keyframes"
              } · ${timeLabel()}`}
            </p>
          }
        >
          <p class="text-xs">No drift</p>
        </Show>
        <p class="text-xs">
          {referenceLabel() == null ? "Reference not set" : `Reference ${referenceLabel()}`}
        </p>
        <Show when={pins().length > 0}>
          <Show
            when={hasPin()}
            fallback={
              <>
                <p class="text-xs">Interpolated</p>
                <p class="text-xs">Set keyframe to move this acquisition time.</p>
              </>
            }
          >
            <p class="text-xs">Keyframe</p>
          </Show>
        </Show>
        <Show when={warning()}>
          <p class="text-xs text-destructive">{warning()}</p>
        </Show>
        <RailActionPair label="Drift keyframes">
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
      </RailControlStack>
    </PanelSection>
  );
}

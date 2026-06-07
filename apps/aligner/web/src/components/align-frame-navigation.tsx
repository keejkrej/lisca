import {
  FrameNavigation,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
} from "@lisca/ui";
import { clamp, selectedIndex } from "@lisca/utils";
import { useMemo } from "react";

import { useAlignPage } from "../state/align-page-context";

export function AlignFrameNavigation() {
  const { state } = useAlignPage();
  const positionOptions = useMemo(
    () => toNavigationOptions(state.scan?.positions ?? []),
    [state.scan],
  );
  const channelOptions = useMemo(
    () => toNavigationOptions(state.scan?.channels ?? []),
    [state.scan],
  );
  const timeIndex = selectedIndex(state.scan?.times, state.selection.time);
  const zIndex = selectedIndex(state.scan?.zSlices, state.selection.z);
  const timeMax = Math.max(0, (state.scan?.times.length ?? 1) - 1);
  const zMax = Math.max(0, (state.scan?.zSlices.length ?? 1) - 1);
  const posIndex = findNavigationOptionIndex(positionOptions, state.selection.pos);
  const chIndex = findNavigationOptionIndex(channelOptions, state.selection.channel);
  const disabled = !state.scan || state.cropping;

  return (
    <FrameNavigation
      position={{
        value: state.selection.pos,
        options: positionOptions,
        disabled,
        onChange: (pos) => state.setSelection({ pos }),
        previousDisabled: disabled || posIndex <= 0,
        nextDisabled: disabled || posIndex >= positionOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(positionOptions, state.selection.pos, -1);
          if (next != null) state.setSelection({ pos: next });
        },
        onNext: () => {
          const next = stepNavigationValue(positionOptions, state.selection.pos, 1);
          if (next != null) state.setSelection({ pos: next });
        },
      }}
      channel={{
        value: state.selection.channel,
        options: channelOptions,
        disabled,
        onChange: (channel) => state.setSelection({ channel }),
        previousDisabled: disabled || chIndex <= 0,
        nextDisabled: disabled || chIndex >= channelOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(channelOptions, state.selection.channel, -1);
          if (next != null) state.setSelection({ channel: next });
        },
        onNext: () => {
          const next = stepNavigationValue(channelOptions, state.selection.channel, 1);
          if (next != null) state.setSelection({ channel: next });
        },
      }}
      timepoint={{
        value: timeIndex,
        min: 0,
        max: timeMax,
        step: 1,
        disabled: disabled || timeMax <= 0,
        onCommit: (i) =>
          state.setSelection({ time: state.scan?.times[clamp(Math.round(i), 0, timeMax)] ?? 0 }),
        previousDisabled: disabled || timeIndex <= 0,
        nextDisabled: disabled || timeIndex >= timeMax,
        onPrevious: () =>
          state.setSelection({ time: state.scan?.times[Math.max(0, timeIndex - 1)] ?? 0 }),
        onNext: () =>
          state.setSelection({ time: state.scan?.times[Math.min(timeMax, timeIndex + 1)] ?? 0 }),
      }}
      zPlane={{
        value: zIndex,
        min: 0,
        max: zMax,
        step: 1,
        disabled: disabled || zMax <= 0,
        onCommit: (i) =>
          state.setSelection({ z: state.scan?.zSlices[clamp(Math.round(i), 0, zMax)] ?? 0 }),
        previousDisabled: disabled || zIndex <= 0,
        nextDisabled: disabled || zIndex >= zMax,
        onPrevious: () =>
          state.setSelection({ z: state.scan?.zSlices[Math.max(0, zIndex - 1)] ?? 0 }),
        onNext: () =>
          state.setSelection({ z: state.scan?.zSlices[Math.min(zMax, zIndex + 1)] ?? 0 }),
      }}
    />
  );
}

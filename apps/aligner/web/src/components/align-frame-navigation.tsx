import {
  FrameNavigation,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
} from "@lisca/ui/features";
import { clamp, selectedIndex } from "@lisca/utils";
import { useMemo } from "react";

import { useAlignCrop, useAlignNav } from "../state/align-page-selectors";

export function AlignFrameNavigation() {
  const nav = useAlignNav();
  const crop = useAlignCrop();
  const positionOptions = useMemo(
    () => toNavigationOptions(nav.scan?.positions ?? []),
    [nav.scan],
  );
  const channelOptions = useMemo(
    () => toNavigationOptions(nav.scan?.channels ?? []),
    [nav.scan],
  );
  const timeIndex = selectedIndex(nav.scan?.times, nav.selection.time);
  const zIndex = selectedIndex(nav.scan?.zSlices, nav.selection.z);
  const timeMax = Math.max(0, (nav.scan?.times.length ?? 1) - 1);
  const zMax = Math.max(0, (nav.scan?.zSlices.length ?? 1) - 1);
  const posIndex = findNavigationOptionIndex(positionOptions, nav.selection.pos);
  const chIndex = findNavigationOptionIndex(channelOptions, nav.selection.channel);
  const disabled = !nav.scan || crop.cropping;

  return (
    <FrameNavigation
      position={{
        value: nav.selection.pos,
        options: positionOptions,
        disabled,
        onChange: (pos) => nav.setSelection({ pos }),
        previousDisabled: disabled || posIndex <= 0,
        nextDisabled: disabled || posIndex >= positionOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(positionOptions, nav.selection.pos, -1);
          if (next != null) nav.setSelection({ pos: next });
        },
        onNext: () => {
          const next = stepNavigationValue(positionOptions, nav.selection.pos, 1);
          if (next != null) nav.setSelection({ pos: next });
        },
      }}
      channel={{
        value: nav.selection.channel,
        options: channelOptions,
        disabled,
        onChange: (channel) => nav.setSelection({ channel }),
        previousDisabled: disabled || chIndex <= 0,
        nextDisabled: disabled || chIndex >= channelOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(channelOptions, nav.selection.channel, -1);
          if (next != null) nav.setSelection({ channel: next });
        },
        onNext: () => {
          const next = stepNavigationValue(channelOptions, nav.selection.channel, 1);
          if (next != null) nav.setSelection({ channel: next });
        },
      }}
      timepoint={{
        value: timeIndex,
        min: 0,
        max: timeMax,
        step: 1,
        disabled: disabled || timeMax <= 0,
        onCommit: (i) =>
          nav.setSelection({ time: nav.scan?.times[clamp(Math.round(i), 0, timeMax)] ?? 0 }),
        previousDisabled: disabled || timeIndex <= 0,
        nextDisabled: disabled || timeIndex >= timeMax,
        onPrevious: () =>
          nav.setSelection({ time: nav.scan?.times[Math.max(0, timeIndex - 1)] ?? 0 }),
        onNext: () =>
          nav.setSelection({ time: nav.scan?.times[Math.min(timeMax, timeIndex + 1)] ?? 0 }),
      }}
      zPlane={{
        value: zIndex,
        min: 0,
        max: zMax,
        step: 1,
        disabled: disabled || zMax <= 0,
        onCommit: (i) =>
          nav.setSelection({ z: nav.scan?.zSlices[clamp(Math.round(i), 0, zMax)] ?? 0 }),
        previousDisabled: disabled || zIndex <= 0,
        nextDisabled: disabled || zIndex >= zMax,
        onPrevious: () =>
          nav.setSelection({ z: nav.scan?.zSlices[Math.max(0, zIndex - 1)] ?? 0 }),
        onNext: () =>
          nav.setSelection({ z: nav.scan?.zSlices[Math.min(zMax, zIndex + 1)] ?? 0 }),
      }}
    />
  );
}

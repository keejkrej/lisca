import type { Html } from "@effect/ui/html";
import type { ContrastWindow, FrameRequest } from "@lisca/contracts";
import {
  ContrastControl,
  FrameNavigation,
  findNavigationOptionIndex,
  selectedAxisIndex,
  stepNavigationValue,
  toAxisNavigationOptions,
} from "@lisca/instrument";
import { clamp } from "@lisca/utils";

import type { StudioAlignNavSnapshot } from "../state/studio-align-page-selectors";

export type StudioAlignNavOptions<M> = {
  readonly nav: StudioAlignNavSnapshot;
  readonly standard?: boolean | undefined;
  readonly onChangePosition: (pos: number) => M;
  readonly onSelectionChange: (patch: Partial<FrameRequest>) => M;
  readonly onContrastChange: (
    contrast: ContrastWindow | null,
    meta?: { readonly lock?: boolean },
  ) => M;
  readonly onContrastLockedChange: (locked: boolean) => M;
};

/** Standard Navigation shows Channel, Frame, and Contrast. Expert adds Position and Z. */
export function StudioAlignNav<M>(h: Html.H<M>, options: StudioAlignNavOptions<M>) {
  const { nav, standard } = options;
  const disabled = !nav.scan;
  const positionOptions = toAxisNavigationOptions(nav.alignPositions, nav.scan?.positionLabels);
  const channelOptions = toAxisNavigationOptions(nav.scan?.channels ?? [], nav.scan?.channelLabels);
  const timeIndex = selectedAxisIndex(nav.scan?.times, nav.selection.time);
  const zIndex = selectedAxisIndex(nav.scan?.zSlices, nav.selection.z);
  const posIndex = findNavigationOptionIndex(positionOptions, nav.selection.pos);
  const chIndex = findNavigationOptionIndex(channelOptions, nav.selection.channel);

  const prevPos = stepNavigationValue(positionOptions, nav.selection.pos, -1);
  const nextPos = stepNavigationValue(positionOptions, nav.selection.pos, 1);

  const prevChannel = stepNavigationValue(channelOptions, nav.selection.channel, -1);
  const nextChannel = stepNavigationValue(channelOptions, nav.selection.channel, 1);

  const timeValues = nav.scan?.times;
  const timeMax = Math.max(0, (timeValues?.length ?? 1) - 1);
  const clampedTime = clamp(timeIndex, 0, timeMax);
  const timeValueLabel =
    timeValues && timeValues.length > 0
      ? `${nav.scan?.timeLabels?.[clampedTime] ?? String(timeValues[clampedTime])} (${clampedTime + 1}/${timeValues.length})`
      : undefined;

  const zValues = nav.scan?.zSlices;
  const zMax = Math.max(0, (zValues?.length ?? 1) - 1);
  const clampedZ = clamp(zIndex, 0, zMax);
  const zValueLabel =
    zValues && zValues.length > 0
      ? `${nav.scan?.zSliceLabels?.[clampedZ] ?? String(zValues[clampedZ])} (${clampedZ + 1}/${zValues.length})`
      : undefined;

  return [
    FrameNavigation(h, {
      key: standard ? "align-nav-standard" : "align-nav-expert",
      sectionAppearance: "rail",
      position: standard
        ? undefined
        : {
            value: nav.selection.pos,
            options: positionOptions,
            disabled,
            onChange: (pos) => options.onChangePosition(pos),
            previousDisabled: disabled || posIndex <= 0,
            nextDisabled: disabled || posIndex >= positionOptions.length - 1,
            onPrevious: options.onChangePosition(prevPos ?? nav.selection.pos),
            onNext: options.onChangePosition(nextPos ?? nav.selection.pos),
          },
      channel: {
        value: nav.selection.channel,
        options: channelOptions,
        disabled,
        onChange: (channel) => options.onSelectionChange({ channel }),
        previousDisabled: disabled || chIndex <= 0,
        nextDisabled: disabled || chIndex >= channelOptions.length - 1,
        onPrevious: options.onSelectionChange({
          channel: prevChannel ?? nav.selection.channel,
        }),
        onNext: options.onSelectionChange({
          channel: nextChannel ?? nav.selection.channel,
        }),
      },
      frame: {
        value: clampedTime,
        min: 0,
        max: timeMax,
        step: 1,
        valueLabel: timeValueLabel,
        axisValues: timeValues,
        axisLabels: nav.scan?.timeLabels,
        disabled: disabled || timeMax <= 0,
        previousDisabled: disabled || clampedTime <= 0,
        nextDisabled: disabled || clampedTime >= timeMax,
        onChange: (nextValue) =>
          options.onSelectionChange({
            time: timeValues?.[clamp(Math.round(nextValue), 0, timeMax)] ?? 0,
          }),
        onCommit: (nextValue) =>
          options.onSelectionChange({
            time: timeValues?.[clamp(Math.round(nextValue), 0, timeMax)] ?? 0,
          }),
        onPrevious: options.onSelectionChange({
          time: timeValues?.[Math.max(0, clampedTime - 1)] ?? 0,
        }),
        onNext: options.onSelectionChange({
          time: timeValues?.[Math.min(timeMax, clampedTime + 1)] ?? 0,
        }),
      },
      zPlane: standard
        ? undefined
        : {
            value: clampedZ,
            min: 0,
            max: zMax,
            step: 1,
            valueLabel: zValueLabel,
            axisValues: zValues,
            axisLabels: nav.scan?.zSliceLabels,
            disabled: disabled || zMax <= 0,
            previousDisabled: disabled || clampedZ <= 0,
            nextDisabled: disabled || clampedZ >= zMax,
            onChange: (nextValue) =>
              options.onSelectionChange({
                z: zValues?.[clamp(Math.round(nextValue), 0, zMax)] ?? 0,
              }),
            onCommit: (nextValue) =>
              options.onSelectionChange({
                z: zValues?.[clamp(Math.round(nextValue), 0, zMax)] ?? 0,
              }),
            onPrevious: options.onSelectionChange({
              z: zValues?.[Math.max(0, clampedZ - 1)] ?? 0,
            }),
            onNext: options.onSelectionChange({
              z: zValues?.[Math.min(zMax, clampedZ + 1)] ?? 0,
            }),
          },
    }),
    ContrastControl(h, {
      key: standard ? "align-contrast-standard" : "align-contrast-expert",
      ariaLabel: "Contrast",
      contrast: nav.contrast,
      contrastLocked: nav.contrastLocked,
      disabled: !nav.frame,
      frame: nav.frame,
      role: "region",
      sectionAppearance: "rail",
      sectionClassName: "min-h-0 shrink-0",
      sectionContentClassName: "flex min-h-0 flex-col",
      onContrastChange: options.onContrastChange,
      onContrastLockedChange: options.onContrastLockedChange,
    }),
  ];
}

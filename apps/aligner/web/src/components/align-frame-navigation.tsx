import {
  FrameNavigation,
  findNavigationOptionIndex,
  selectedAxisIndex,
  stepNavigationValue,
  toAxisNavigationOptions,
} from "@lisca/ui/features";
import { clamp } from "@lisca/utils";
import { createMemo } from "solid-js";
import { useAlignNav } from "../state/align-page-selectors";

export function AlignFrameNavigation() {
  const nav = useAlignNav();
  const disabled = createMemo(() => !nav.scan);
  const positionOptions = createMemo(() =>
    toAxisNavigationOptions(nav.scan?.positions ?? [], nav.scan?.positionLabels),
  );
  const channelOptions = createMemo(() =>
    toAxisNavigationOptions(nav.scan?.channels ?? [], nav.scan?.channelLabels),
  );
  const timeIndex = createMemo(() => selectedAxisIndex(nav.scan?.times, nav.selection.time));
  const zIndex = createMemo(() => selectedAxisIndex(nav.scan?.zSlices, nav.selection.z));
  const posIndex = createMemo(() =>
    findNavigationOptionIndex(positionOptions(), nav.selection.pos),
  );
  const chIndex = createMemo(() =>
    findNavigationOptionIndex(channelOptions(), nav.selection.channel),
  );

  return (
    <FrameNavigation
      sectionAppearance="rail"
      position={{
        get value() {
          return nav.selection.pos;
        },
        get options() {
          return positionOptions();
        },
        get disabled() {
          return disabled();
        },
        onChange: (pos) => nav.setSelection({ pos }),
        get previousDisabled() {
          return disabled() || posIndex() <= 0;
        },
        get nextDisabled() {
          return disabled() || posIndex() >= positionOptions().length - 1;
        },
        onPrevious: () => {
          const next = stepNavigationValue(positionOptions(), nav.selection.pos, -1);
          if (next != null) nav.setSelection({ pos: next });
        },
        onNext: () => {
          const next = stepNavigationValue(positionOptions(), nav.selection.pos, 1);
          if (next != null) nav.setSelection({ pos: next });
        },
      }}
      channel={{
        get value() {
          return nav.selection.channel;
        },
        get options() {
          return channelOptions();
        },
        get disabled() {
          return disabled();
        },
        onChange: (channel) => nav.setSelection({ channel }),
        get previousDisabled() {
          return disabled() || chIndex() <= 0;
        },
        get nextDisabled() {
          return disabled() || chIndex() >= channelOptions().length - 1;
        },
        onPrevious: () => {
          const next = stepNavigationValue(channelOptions(), nav.selection.channel, -1);
          if (next != null) nav.setSelection({ channel: next });
        },
        onNext: () => {
          const next = stepNavigationValue(channelOptions(), nav.selection.channel, 1);
          if (next != null) nav.setSelection({ channel: next });
        },
      }}
      timepoint={{
        get value() {
          return clamp(timeIndex(), 0, Math.max(0, (nav.scan?.times?.length ?? 1) - 1));
        },
        get min() {
          return 0;
        },
        get max() {
          return Math.max(0, (nav.scan?.times?.length ?? 1) - 1);
        },
        step: 1,
        get valueLabel() {
          const axisValues = nav.scan?.times;
          if (!axisValues || axisValues.length === 0) return undefined;
          const max = axisValues.length - 1;
          const clamped = clamp(timeIndex(), 0, max);
          const frame = clamped + 1;
          const total = axisValues.length;
          const displayValue = nav.scan?.timeLabels?.[clamped] ?? String(axisValues[clamped]);
          return `${displayValue} (${frame}/${total})`;
        },
        get axisValues() {
          return nav.scan?.times;
        },
        get axisLabels() {
          return nav.scan?.timeLabels;
        },
        get disabled() {
          const baseDisabled = disabled();
          const max = Math.max(0, (nav.scan?.times?.length ?? 1) - 1);
          return baseDisabled || max <= 0;
        },
        get previousDisabled() {
          const baseDisabled = disabled();
          const max = Math.max(0, (nav.scan?.times?.length ?? 1) - 1);
          const idx = clamp(timeIndex(), 0, max);
          return baseDisabled || idx <= 0;
        },
        get nextDisabled() {
          const baseDisabled = disabled();
          const max = Math.max(0, (nav.scan?.times?.length ?? 1) - 1);
          const idx = clamp(timeIndex(), 0, max);
          return baseDisabled || idx >= max;
        },
        onCommit: (nextValue) => {
          const max = Math.max(0, (nav.scan?.times?.length ?? 1) - 1);
          nav.setSelection({ time: nav.scan?.times?.[clamp(Math.round(nextValue), 0, max)] ?? 0 });
        },
        onPrevious: () => {
          const max = Math.max(0, (nav.scan?.times?.length ?? 1) - 1);
          nav.setSelection({
            time: nav.scan?.times?.[Math.max(0, clamp(timeIndex(), 0, max) - 1)] ?? 0,
          });
        },
        onNext: () => {
          const max = Math.max(0, (nav.scan?.times?.length ?? 1) - 1);
          nav.setSelection({
            time: nav.scan?.times?.[Math.min(max, clamp(timeIndex(), 0, max) + 1)] ?? 0,
          });
        },
      }}
      zPlane={{
        get value() {
          return clamp(zIndex(), 0, Math.max(0, (nav.scan?.zSlices?.length ?? 1) - 1));
        },
        get min() {
          return 0;
        },
        get max() {
          return Math.max(0, (nav.scan?.zSlices?.length ?? 1) - 1);
        },
        step: 1,
        get valueLabel() {
          const axisValues = nav.scan?.zSlices;
          if (!axisValues || axisValues.length === 0) return undefined;
          const max = axisValues.length - 1;
          const clamped = clamp(zIndex(), 0, max);
          const frame = clamped + 1;
          const total = axisValues.length;
          const displayValue = nav.scan?.zSliceLabels?.[clamped] ?? String(axisValues[clamped]);
          return `${displayValue} (${frame}/${total})`;
        },
        get axisValues() {
          return nav.scan?.zSlices;
        },
        get axisLabels() {
          return nav.scan?.zSliceLabels;
        },
        get disabled() {
          const baseDisabled = disabled();
          const max = Math.max(0, (nav.scan?.zSlices?.length ?? 1) - 1);
          return baseDisabled || max <= 0;
        },
        get previousDisabled() {
          const baseDisabled = disabled();
          const max = Math.max(0, (nav.scan?.zSlices?.length ?? 1) - 1);
          const idx = clamp(zIndex(), 0, max);
          return baseDisabled || idx <= 0;
        },
        get nextDisabled() {
          const baseDisabled = disabled();
          const max = Math.max(0, (nav.scan?.zSlices?.length ?? 1) - 1);
          const idx = clamp(zIndex(), 0, max);
          return baseDisabled || idx >= max;
        },
        onCommit: (nextValue) => {
          const max = Math.max(0, (nav.scan?.zSlices?.length ?? 1) - 1);
          nav.setSelection({ z: nav.scan?.zSlices?.[clamp(Math.round(nextValue), 0, max)] ?? 0 });
        },
        onPrevious: () => {
          const max = Math.max(0, (nav.scan?.zSlices?.length ?? 1) - 1);
          nav.setSelection({
            z: nav.scan?.zSlices?.[Math.max(0, clamp(zIndex(), 0, max) - 1)] ?? 0,
          });
        },
        onNext: () => {
          const max = Math.max(0, (nav.scan?.zSlices?.length ?? 1) - 1);
          nav.setSelection({
            z: nav.scan?.zSlices?.[Math.min(max, clamp(zIndex(), 0, max) + 1)] ?? 0,
          });
        },
      }}
    />
  );
}

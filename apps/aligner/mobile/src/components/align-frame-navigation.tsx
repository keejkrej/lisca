import {
  createAxisIndexSliderControl,
  findNavigationOptionIndex,
  FrameNavigation,
  selectedAxisIndex,
  stepNavigationValue,
  toAxisNavigationOptions,
} from "@lisca/ui-native";
import type { AlignState } from "../state/use-align-state";
export function AlignFrameNavigation({ state }: { state: AlignState }) {
  const positionOptions = toAxisNavigationOptions(
    state.scan?.positions ?? [],
    state.scan?.positionLabels,
  );
  const channelOptions = toAxisNavigationOptions(
    state.scan?.channels ?? [],
    state.scan?.channelLabels,
  );
  const timeIndex = selectedAxisIndex(state.scan?.times, state.selection.time);
  const zIndex = selectedAxisIndex(state.scan?.zSlices, state.selection.z);
  const posIndex = findNavigationOptionIndex(positionOptions, state.selection.pos);
  const chIndex = findNavigationOptionIndex(channelOptions, state.selection.channel);
  const disabled = !state.scan || state.cropping;
  return (
    <FrameNavigation
      position={{
        value: state.selection.pos,
        options: positionOptions,
        disabled,
        onChange: (pos) =>
          state.setSelection({
            pos,
          }),
        previousDisabled: disabled || posIndex <= 0,
        nextDisabled: disabled || posIndex >= positionOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(positionOptions, state.selection.pos, -1);
          if (next != null)
            state.setSelection({
              pos: next,
            });
        },
        onNext: () => {
          const next = stepNavigationValue(positionOptions, state.selection.pos, 1);
          if (next != null)
            state.setSelection({
              pos: next,
            });
        },
      }}
      channel={{
        value: state.selection.channel,
        options: channelOptions,
        disabled,
        onChange: (channel) =>
          state.setSelection({
            channel,
          }),
        previousDisabled: disabled || chIndex <= 0,
        nextDisabled: disabled || chIndex >= channelOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(channelOptions, state.selection.channel, -1);
          if (next != null)
            state.setSelection({
              channel: next,
            });
        },
        onNext: () => {
          const next = stepNavigationValue(channelOptions, state.selection.channel, 1);
          if (next != null)
            state.setSelection({
              channel: next,
            });
        },
      }}
      timepoint={createAxisIndexSliderControl({
        axisValues: state.scan?.times,
        axisLabels: state.scan?.timeLabels,
        index: timeIndex,
        disabled,
        onIndexChange: (index) =>
          state.setSelection({
            time: state.scan?.times[index] ?? 0,
          }),
      })}
      zPlane={createAxisIndexSliderControl({
        axisValues: state.scan?.zSlices,
        axisLabels: state.scan?.zSliceLabels,
        index: zIndex,
        disabled,
        onIndexChange: (index) =>
          state.setSelection({
            z: state.scan?.zSlices[index] ?? 0,
          }),
      })}
    />
  );
}

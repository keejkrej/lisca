import {
  createAxisIndexSliderControl,
  FrameNavigation,
  findNavigationOptionIndex,
  selectedAxisIndex,
  stepNavigationValue,
  toAxisNavigationOptions,
} from "@lisca/ui/features";
import { useAlignCrop, useAlignNav } from "../state/align-page-selectors";
export function AlignFrameNavigation() {
  const nav = useAlignNav();
  const crop = useAlignCrop();
  const positionOptions = toAxisNavigationOptions(
    nav.scan?.positions ?? [],
    nav.scan?.positionLabels,
  );
  const channelOptions = toAxisNavigationOptions(
    nav.scan?.channels ?? [],
    nav.scan?.channelLabels,
  );
  const timeIndex = selectedAxisIndex(nav.scan?.times, nav.selection.time);
  const zIndex = selectedAxisIndex(nav.scan?.zSlices, nav.selection.z);
  const posIndex = findNavigationOptionIndex(positionOptions, nav.selection.pos);
  const chIndex = findNavigationOptionIndex(channelOptions, nav.selection.channel);
  const disabled = !nav.scan || crop.cropping;
  return (
    <FrameNavigation
      position={{
        value: nav.selection.pos,
        options: positionOptions,
        disabled,
        onChange: (pos) =>
          nav.setSelection({
            pos,
          }),
        previousDisabled: disabled || posIndex <= 0,
        nextDisabled: disabled || posIndex >= positionOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(positionOptions, nav.selection.pos, -1);
          if (next != null)
            nav.setSelection({
              pos: next,
            });
        },
        onNext: () => {
          const next = stepNavigationValue(positionOptions, nav.selection.pos, 1);
          if (next != null)
            nav.setSelection({
              pos: next,
            });
        },
      }}
      channel={{
        value: nav.selection.channel,
        options: channelOptions,
        disabled,
        onChange: (channel) =>
          nav.setSelection({
            channel,
          }),
        previousDisabled: disabled || chIndex <= 0,
        nextDisabled: disabled || chIndex >= channelOptions.length - 1,
        onPrevious: () => {
          const next = stepNavigationValue(channelOptions, nav.selection.channel, -1);
          if (next != null)
            nav.setSelection({
              channel: next,
            });
        },
        onNext: () => {
          const next = stepNavigationValue(channelOptions, nav.selection.channel, 1);
          if (next != null)
            nav.setSelection({
              channel: next,
            });
        },
      }}
      timepoint={createAxisIndexSliderControl({
        axisValues: nav.scan?.times,
        axisLabels: nav.scan?.timeLabels,
        index: timeIndex,
        disabled,
        onIndexChange: (index) =>
          nav.setSelection({
            time: nav.scan?.times[index] ?? 0,
          }),
      })}
      zPlane={createAxisIndexSliderControl({
        axisValues: nav.scan?.zSlices,
        axisLabels: nav.scan?.zSliceLabels,
        index: zIndex,
        disabled,
        onIndexChange: (index) =>
          nav.setSelection({
            z: nav.scan?.zSlices[index] ?? 0,
          }),
      })}
    />
  );
}

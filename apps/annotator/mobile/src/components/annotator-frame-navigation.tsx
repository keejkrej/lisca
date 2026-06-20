import {
  createAxisIndexSliderControl,
  findNavigationOptionIndex,
  FrameNavigation,
  stepNavigationValue,
  toAxisNavigationOptions,
} from "@lisca/ui-native";

import { useAnnotateNav } from "../state/annotate-page-selectors";

export function AnnotatorFrameNavigation() {
  const nav = useAnnotateNav();
  const positionOptions = toAxisNavigationOptions(
    nav.scan?.positions.map((entry) => entry.pos) ?? [],
  );
  const roiOptions =
    nav.position?.rois.map((entry) => ({
      value: entry.roi,
      label: String(entry.roi),
    })) ?? [];
  const channelOptions = toAxisNavigationOptions(nav.position?.channels ?? []);
  const posValue = nav.selection.pos ?? positionOptions[0]?.value ?? 0;
  const roiValue = nav.selection.roi ?? roiOptions[0]?.value ?? 0;
  const channelValue = nav.selection.channel ?? channelOptions[0]?.value ?? 0;

  return (
    <FrameNavigation
      channel={{
        value: channelValue,
        options: channelOptions,
        disabled: channelOptions.length === 0,
        previousDisabled: findNavigationOptionIndex(channelOptions, channelValue) <= 0,
        nextDisabled:
          findNavigationOptionIndex(channelOptions, channelValue) >= channelOptions.length - 1,
        onChange: (value) => nav.changeSelection(() => nav.setSelection({ channel: value })),
        onPrevious: () => {
          const next = stepNavigationValue(channelOptions, channelValue, -1);
          if (next != null) nav.changeSelection(() => nav.setSelection({ channel: next }));
        },
        onNext: () => {
          const next = stepNavigationValue(channelOptions, channelValue, 1);
          if (next != null) nav.changeSelection(() => nav.setSelection({ channel: next }));
        },
      }}
      position={{
        value: posValue,
        options: positionOptions,
        disabled: positionOptions.length === 0,
        previousDisabled: findNavigationOptionIndex(positionOptions, posValue) <= 0,
        nextDisabled:
          findNavigationOptionIndex(positionOptions, posValue) >= positionOptions.length - 1,
        onChange: (value) => nav.changeSelection(() => nav.setSelection({ pos: value, roi: null })),
        onPrevious: () => {
          const next = stepNavigationValue(positionOptions, posValue, -1);
          if (next != null) nav.changeSelection(() => nav.setSelection({ pos: next, roi: null }));
        },
        onNext: () => {
          const next = stepNavigationValue(positionOptions, posValue, 1);
          if (next != null) nav.changeSelection(() => nav.setSelection({ pos: next, roi: null }));
        },
      }}
      roi={{
        value: roiValue,
        options: roiOptions,
        disabled: roiOptions.length === 0,
        previousDisabled: findNavigationOptionIndex(roiOptions, roiValue) <= 0,
        nextDisabled: findNavigationOptionIndex(roiOptions, roiValue) >= roiOptions.length - 1,
        onChange: (value) => nav.changeSelection(() => nav.setSelection({ roi: value })),
        onPrevious: () => {
          const next = stepNavigationValue(roiOptions, roiValue, -1);
          if (next != null) nav.changeSelection(() => nav.setSelection({ roi: next }));
        },
        onNext: () => {
          const next = stepNavigationValue(roiOptions, roiValue, 1);
          if (next != null) nav.changeSelection(() => nav.setSelection({ roi: next }));
        },
      }}
      timepoint={createAxisIndexSliderControl({
        axisValues: nav.position?.times,
        index: nav.selection.timeIndex,
        onIndexChange: (timeIndex) => nav.changeSelection(() => nav.setSelection({ timeIndex })),
      })}
      zPlane={createAxisIndexSliderControl({
        axisValues: nav.position?.zSlices,
        index: nav.selection.zIndex,
        onIndexChange: (zIndex) => nav.changeSelection(() => nav.setSelection({ zIndex })),
      })}
    />
  );
}

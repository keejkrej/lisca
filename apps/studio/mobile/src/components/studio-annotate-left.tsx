import {
  ContrastControl,
  createAxisIndexSliderControl,
  findNavigationOptionIndex,
  FrameNavigation,
  SidebarStack,
  stepNavigationValue,
  Text,
  toAxisNavigationOptions,
} from "@lisca/ui-native";
import { View } from "react-native";

import { useStudioAnnotateNav } from "../state/studio-annotate-page-selectors";

export function StudioAnnotateLeft() {
  const nav = useStudioAnnotateNav();

  if (nav.workspaceMissing) {
    return (
      <View className="min-h-0 flex-1 gap-2 p-3">
        <Text className="text-sm text-destructive">Set a save location in Basic info first.</Text>
      </View>
    );
  }

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
    <SidebarStack>
      <FrameNavigation
        position={{
          value: posValue,
          options: positionOptions,
          disabled: positionOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(positionOptions, posValue) <= 0,
          nextDisabled:
            findNavigationOptionIndex(positionOptions, posValue) >= positionOptions.length - 1,
          onChange: (value) =>
            nav.changeSelection(() => nav.setSelection({ pos: value, roi: null })),
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
      <ContrastControl
        contrast={nav.contrast}
        disabled={!nav.frame}
        frame={nav.frame}
        sectionClassName="min-h-0 shrink-0"
        sectionContentClassName="flex min-h-0 flex-col overflow-auto"
        onContrastChange={nav.setContrast}
      />
    </SidebarStack>
  );
}

import type { ContrastWindow, RoiPositionScan, RoiWorkspaceScan } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import {
  ContrastControl,
  createAxisIndexSliderControl,
  findNavigationOptionIndex,
  FrameNavigation,
  stepNavigationValue,
  toAxisNavigationOptions,
} from "@lisca/ui-native";
import { StyleSheet, View } from "react-native";
export function AnnotatorLeft(props: {
  scan: RoiWorkspaceScan | null;
  position: RoiPositionScan | null;
  pos: number | null;
  roi: number | null;
  channel: number | null;
  timeIndex: number;
  zIndex: number;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  onPosChange: (value: number) => void;
  onRoiChange: (value: number) => void;
  onChannelChange: (value: number) => void;
  onTimeIndexChange: (value: number) => void;
  onZIndexChange: (value: number) => void;
  onContrastChange: (value: ContrastWindow | null) => void;
}) {
  const positionOptions = toAxisNavigationOptions(
    props.scan?.positions.map((entry) => entry.pos) ?? [],
  );
  const roiOptions =
    props.position?.rois.map((entry) => ({
      value: entry.roi,
      label: String(entry.roi),
    })) ?? [];
  const channelOptions = toAxisNavigationOptions(props.position?.channels ?? []);
  const posValue = props.pos ?? positionOptions[0]?.value ?? 0;
  const roiValue = props.roi ?? roiOptions[0]?.value ?? 0;
  const channelValue = props.channel ?? channelOptions[0]?.value ?? 0;
  return (
    <View style={styles.root}>
      <FrameNavigation
        channel={{
          value: channelValue,
          options: channelOptions,
          disabled: channelOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(channelOptions, channelValue) <= 0,
          nextDisabled:
            findNavigationOptionIndex(channelOptions, channelValue) >= channelOptions.length - 1,
          onChange: props.onChannelChange,
          onPrevious: () => {
            const next = stepNavigationValue(channelOptions, channelValue, -1);
            if (next != null) props.onChannelChange(next);
          },
          onNext: () => {
            const next = stepNavigationValue(channelOptions, channelValue, 1);
            if (next != null) props.onChannelChange(next);
          },
        }}
        position={{
          value: posValue,
          options: positionOptions,
          disabled: positionOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(positionOptions, posValue) <= 0,
          nextDisabled:
            findNavigationOptionIndex(positionOptions, posValue) >= positionOptions.length - 1,
          onChange: props.onPosChange,
          onPrevious: () => {
            const next = stepNavigationValue(positionOptions, posValue, -1);
            if (next != null) props.onPosChange(next);
          },
          onNext: () => {
            const next = stepNavigationValue(positionOptions, posValue, 1);
            if (next != null) props.onPosChange(next);
          },
        }}
        roi={{
          value: roiValue,
          options: roiOptions,
          disabled: roiOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(roiOptions, roiValue) <= 0,
          nextDisabled: findNavigationOptionIndex(roiOptions, roiValue) >= roiOptions.length - 1,
          onChange: props.onRoiChange,
          onPrevious: () => {
            const next = stepNavigationValue(roiOptions, roiValue, -1);
            if (next != null) props.onRoiChange(next);
          },
          onNext: () => {
            const next = stepNavigationValue(roiOptions, roiValue, 1);
            if (next != null) props.onRoiChange(next);
          },
        }}
        timepoint={createAxisIndexSliderControl({
          axisValues: props.position?.times,
          index: props.timeIndex,
          onIndexChange: props.onTimeIndexChange,
        })}
        zPlane={createAxisIndexSliderControl({
          axisValues: props.position?.zSlices,
          index: props.zIndex,
          onIndexChange: props.onZIndexChange,
        })}
      />
      <ContrastControl
        contrast={props.contrast}
        disabled={!props.frame}
        frame={props.frame}
        onContrastChange={props.onContrastChange}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 8,
    margin: -12,
    minHeight: 0,
    padding: 12,
  },
});

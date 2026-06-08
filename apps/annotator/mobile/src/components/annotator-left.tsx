import type { ContrastWindow, FrameResult, RoiPositionScan, RoiWorkspaceScan } from "@lisca/contracts";
import {
  ContrastControl,
  findNavigationOptionIndex,
  FrameNavigation,
  stepNavigationValue,
  toNavigationOptions,
} from "@lisca/ui-native";
import { clamp } from "@lisca/utils";
import { useMemo } from "react";
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
  const domain = props.frame?.contrastDomain ?? { min: 0, max: 255 };
  const value = props.contrast ?? { min: domain.min, max: domain.max };
  const suggestedContrast =
    props.frame?.suggestedContrast ??
    props.frame?.appliedContrast ?? { min: domain.min, max: domain.max };
  const positionOptions = useMemo(
    () => toNavigationOptions(props.scan?.positions.map((entry) => entry.pos) ?? []),
    [props.scan],
  );
  const roiOptions = useMemo(
    () =>
      props.position?.rois.map((entry) => ({ value: entry.roi, label: String(entry.roi) })) ?? [],
    [props.position],
  );
  const channelOptions = useMemo(
    () => toNavigationOptions(props.position?.channels ?? []),
    [props.position],
  );
  const timeMax = Math.max(0, (props.position?.times.length ?? 1) - 1);
  const zMax = Math.max(0, (props.position?.zSlices.length ?? 1) - 1);

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
        timepoint={{
          value: props.timeIndex,
          min: 0,
          max: timeMax,
          step: 1,
          disabled: timeMax <= 0,
          previousDisabled: props.timeIndex <= 0,
          nextDisabled: props.timeIndex >= timeMax,
          onCommit: (value) => props.onTimeIndexChange(clamp(Math.round(value), 0, timeMax)),
          onPrevious: () => props.onTimeIndexChange(Math.max(0, props.timeIndex - 1)),
          onNext: () => props.onTimeIndexChange(Math.min(timeMax, props.timeIndex + 1)),
        }}
        zPlane={{
          value: props.zIndex,
          min: 0,
          max: zMax,
          step: 1,
          disabled: zMax <= 0,
          previousDisabled: props.zIndex <= 0,
          nextDisabled: props.zIndex >= zMax,
          onCommit: (value) => props.onZIndexChange(clamp(Math.round(value), 0, zMax)),
          onPrevious: () => props.onZIndexChange(Math.max(0, props.zIndex - 1)),
          onNext: () => props.onZIndexChange(Math.min(zMax, props.zIndex + 1)),
        }}
      />
      <ContrastControl
        disabled={!props.frame}
        domainMax={domain.max}
        domainMin={domain.min}
        maxValue={value.max}
        minValue={value.min}
        onAutoRange={() => props.onContrastChange(suggestedContrast)}
        onMaxCommit={(max) => props.onContrastChange({ min: value.min, max })}
        onMinCommit={(min) => props.onContrastChange({ min, max: value.max })}
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

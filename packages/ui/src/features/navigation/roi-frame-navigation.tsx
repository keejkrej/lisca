import type { RoiPositionScan, RoiWorkspaceScan } from "@lisca/contracts";
import {
  createAxisIndexSliderControl,
  findNavigationOptionIndex,
  stepNavigationValue,
  toAxisNavigationOptions,
  type NavigationOption,
  type NavigationValue,
} from "@lisca/utils";

import { FrameNavigation, type FrameNavigationProps } from "./frame-navigation";

export type RoiFrameSelection = {
  pos: number | null;
  roi: number | null;
  channel: number | null;
  timeIndex: number;
  zIndex: number;
};

export type RoiFrameNavigationProps = {
  scan: RoiWorkspaceScan | null | undefined;
  position: RoiPositionScan | null | undefined;
  selection: RoiFrameSelection;
  changeSelection: (apply: () => void) => void;
  setSelection: (patch: Partial<RoiFrameSelection>) => void;
} & Pick<
  FrameNavigationProps<number>,
  "class" | "sectionTitle" | "sectionDescription" | "sectionClassName" | "sectionContentClassName"
>;

function buildSelectStepperControl<T extends NavigationValue>(args: {
  value: T;
  options: NavigationOption<T>[];
  onChange: (value: T) => void;
  changeSelection: (apply: () => void) => void;
}) {
  const index = () => findNavigationOptionIndex(args.options, args.value);
  return {
    value: args.value,
    options: args.options,
    disabled: args.options.length === 0,
    previousDisabled: index() <= 0,
    nextDisabled: index() >= args.options.length - 1,
    onChange: (value: T) => args.changeSelection(() => args.onChange(value)),
    onPrevious: () => {
      const next = stepNavigationValue(args.options, args.value, -1);
      if (next != null) args.changeSelection(() => args.onChange(next));
    },
    onNext: () => {
      const next = stepNavigationValue(args.options, args.value, 1);
      if (next != null) args.changeSelection(() => args.onChange(next));
    },
  };
}

/** Shared ROI workspace navigation: position, ROI, channel, timepoint, and Z plane. */
export function RoiFrameNavigation(props: RoiFrameNavigationProps) {
  const positionOptions = () =>
    toAxisNavigationOptions(props.scan?.positions.map((entry) => entry.pos) ?? []);
  const roiOptions = () =>
    props.position?.rois.map((entry) => ({
      value: entry.roi,
      label: String(entry.roi),
    })) ?? [];
  const channelOptions = () => toAxisNavigationOptions(props.position?.channels ?? []);
  const posValue = () => props.selection.pos ?? positionOptions()[0]?.value ?? 0;
  const roiValue = () => props.selection.roi ?? roiOptions()[0]?.value ?? 0;
  const channelValue = () => props.selection.channel ?? channelOptions()[0]?.value ?? 0;

  return (
    <FrameNavigation
      class={props.class}
      sectionClassName={props.sectionClassName}
      sectionContentClassName={props.sectionContentClassName}
      sectionDescription={props.sectionDescription}
      sectionTitle={props.sectionTitle}
      channel={buildSelectStepperControl({
        value: channelValue(),
        options: channelOptions(),
        changeSelection: props.changeSelection,
        onChange: (channel) => props.setSelection({ channel }),
      })}
      position={buildSelectStepperControl({
        value: posValue(),
        options: positionOptions(),
        changeSelection: props.changeSelection,
        onChange: (pos) => props.setSelection({ pos, roi: null }),
      })}
      roi={buildSelectStepperControl({
        value: roiValue(),
        options: roiOptions(),
        changeSelection: props.changeSelection,
        onChange: (roi) => props.setSelection({ roi }),
      })}
      timepoint={createAxisIndexSliderControl({
        axisValues: props.position?.times,
        index: props.selection.timeIndex,
        onIndexChange: (timeIndex) =>
          props.changeSelection(() => props.setSelection({ timeIndex })),
      })}
      zPlane={createAxisIndexSliderControl({
        axisValues: props.position?.zSlices,
        index: props.selection.zIndex,
        onIndexChange: (zIndex) => props.changeSelection(() => props.setSelection({ zIndex })),
      })}
    />
  );
}

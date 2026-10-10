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
  /** Frame slider only, titled Frame. */
  frameOnly?: boolean;
  /** Channel and Frame under Navigation. Expert mode keeps position, ROI, channel, frame, and Z. */
  standard?: boolean;
} & Pick<
  FrameNavigationProps<number>,
  | "class"
  | "sectionTitle"
  | "sectionDescription"
  | "sectionClassName"
  | "sectionContentClassName"
  | "sectionAppearance"
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

/** Shared ROI workspace navigation: position, ROI, channel, frame, and Z plane. */
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
  const frameAxisOnly = () => Boolean(props.frameOnly);
  const hideExpertAxes = () => frameAxisOnly() || Boolean(props.standard);

  return (
    <FrameNavigation
      class={props.class}
      sectionAppearance={props.sectionAppearance}
      sectionClassName={props.sectionClassName}
      sectionContentClassName={props.sectionContentClassName}
      sectionDescription={props.sectionDescription}
      sectionTitle={frameAxisOnly() ? "Frame" : props.sectionTitle}
      channel={
        frameAxisOnly()
          ? undefined
          : buildSelectStepperControl({
              value: channelValue(),
              options: channelOptions(),
              changeSelection: props.changeSelection,
              onChange: (channel) => props.setSelection({ channel }),
            })
      }
      position={
        hideExpertAxes()
          ? undefined
          : buildSelectStepperControl({
              value: posValue(),
              options: positionOptions(),
              changeSelection: props.changeSelection,
              onChange: (pos) => props.setSelection({ pos, roi: null }),
            })
      }
      roi={
        hideExpertAxes()
          ? undefined
          : buildSelectStepperControl({
              value: roiValue(),
              options: roiOptions(),
              changeSelection: props.changeSelection,
              onChange: (roi) => props.setSelection({ roi }),
            })
      }
      frame={createAxisIndexSliderControl({
        axisValues: props.position?.times,
        index: props.selection.timeIndex,
        onIndexChange: (timeIndex) =>
          props.changeSelection(() => props.setSelection({ timeIndex })),
      })}
      zPlane={
        hideExpertAxes()
          ? undefined
          : createAxisIndexSliderControl({
              axisValues: props.position?.zSlices,
              index: props.selection.zIndex,
              onIndexChange: (zIndex) =>
                props.changeSelection(() => props.setSelection({ zIndex })),
            })
      }
    />
  );
}

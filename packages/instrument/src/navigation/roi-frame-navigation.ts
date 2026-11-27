import type { Html } from "@effect/ui/html";
import type { RoiPositionScan, RoiWorkspaceScan } from "@lisca/contracts";
import {
  findNavigationOptionIndex,
  formatAxisValueLabel,
  stepNavigationValue,
  toAxisNavigationOptions,
  type NavigationOption,
  type NavigationValue,
} from "@lisca/utils";

import {
  FrameNavigation,
  type FrameNavigationOptions,
  type SelectNavigationControlProps,
  type SliderNavigationControlProps,
} from "./frame-navigation";

export type RoiFrameSelection = {
  readonly pos: number | null;
  readonly roi: number | null;
  readonly channel: number | null;
  readonly timeIndex: number;
  readonly zIndex: number;
};

export type RoiFrameNavigationOptions<M> = {
  readonly key?: string | undefined;
  readonly scan: RoiWorkspaceScan | null | undefined;
  readonly position: RoiPositionScan | null | undefined;
  readonly selection: RoiFrameSelection;
  readonly onSelectionChange: (patch: Partial<RoiFrameSelection>) => M;
  /** Frame slider only, titled Frame. */
  readonly frameOnly?: boolean | undefined;
  /** Channel and Frame under Navigation. Expert mode keeps position, ROI, channel, frame, and Z. */
  readonly standard?: boolean | undefined;
} & Pick<
  FrameNavigationOptions<number, M>,
  | "class"
  | "sectionTitle"
  | "sectionDescription"
  | "sectionClassName"
  | "sectionContentClassName"
  | "sectionAppearance"
>;

export type RoiFrameNavigationProps<M = never> = RoiFrameNavigationOptions<M>;

function buildSelectStepperControl<T extends NavigationValue, M>(args: {
  readonly value: T;
  readonly options: readonly NavigationOption<T>[];
  readonly onChange: (value: T) => M;
}): SelectNavigationControlProps<T, M> {
  const index = findNavigationOptionIndex([...args.options], args.value);
  const prevValue = stepNavigationValue([...args.options], args.value, -1);
  const nextValue = stepNavigationValue([...args.options], args.value, 1);
  return {
    value: args.value,
    options: args.options,
    disabled: args.options.length === 0,
    previousDisabled: index <= 0,
    nextDisabled: index >= args.options.length - 1,
    onChange: args.onChange,
    onPrevious: args.onChange(prevValue ?? args.value),
    onNext: args.onChange(nextValue ?? args.value),
  };
}

function buildAxisSliderControl<M>(args: {
  readonly axisValues: readonly number[] | undefined;
  readonly index: number;
  readonly onIndexChange: (index: number) => M;
}): SliderNavigationControlProps<M> {
  const values = args.axisValues ?? [];
  const count = values.length;
  const max = Math.max(0, count - 1);
  const clamped = Math.min(Math.max(0, args.index), max);
  const valueLabel = count > 0 ? formatAxisValueLabel(values, clamped) : undefined;
  return {
    value: clamped,
    min: 0,
    max,
    step: 1,
    axisValues: values,
    valueLabel,
    disabled: count <= 1,
    previousDisabled: clamped <= 0,
    nextDisabled: clamped >= max,
    onChange: args.onIndexChange,
    onCommit: args.onIndexChange,
    onPrevious: args.onIndexChange(Math.max(0, clamped - 1)),
    onNext: args.onIndexChange(Math.min(max, clamped + 1)),
  };
}

/** Shared ROI workspace navigation: position, ROI, channel, frame, and Z plane. */
export function RoiFrameNavigation<M>(h: Html.H<M>, options: RoiFrameNavigationOptions<M>) {
  const positionOptions = toAxisNavigationOptions(
    options.scan?.positions.map((entry) => entry.pos) ?? [],
  );
  const roiOptions =
    options.position?.rois.map((entry) => ({
      value: entry.roi,
      label: String(entry.roi),
    })) ?? [];
  const channelOptions = toAxisNavigationOptions(options.position?.channels ?? []);

  const posValue = options.selection.pos ?? positionOptions[0]?.value ?? 0;
  const roiValue = options.selection.roi ?? roiOptions[0]?.value ?? 0;
  const channelValue = options.selection.channel ?? channelOptions[0]?.value ?? 0;
  const frameAxisOnly = Boolean(options.frameOnly);
  const hideExpertAxes = frameAxisOnly || Boolean(options.standard);

  return FrameNavigation(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    class: options.class,
    sectionAppearance: options.sectionAppearance,
    sectionClassName: options.sectionClassName,
    sectionContentClassName: options.sectionContentClassName,
    sectionDescription: options.sectionDescription,
    sectionTitle: frameAxisOnly ? "Frame" : options.sectionTitle,
    channel: frameAxisOnly
      ? undefined
      : buildSelectStepperControl({
          value: channelValue,
          options: channelOptions,
          onChange: (channel) => options.onSelectionChange({ channel }),
        }),
    position: hideExpertAxes
      ? undefined
      : buildSelectStepperControl({
          value: posValue,
          options: positionOptions,
          onChange: (pos) => options.onSelectionChange({ pos, roi: null }),
        }),
    roi: hideExpertAxes
      ? undefined
      : buildSelectStepperControl({
          value: roiValue,
          options: roiOptions,
          onChange: (roi) => options.onSelectionChange({ roi }),
        }),
    frame: buildAxisSliderControl({
      axisValues: options.position?.times,
      index: options.selection.timeIndex,
      onIndexChange: (timeIndex) => options.onSelectionChange({ timeIndex }),
    }),
    zPlane: hideExpertAxes
      ? undefined
      : buildAxisSliderControl({
          axisValues: options.position?.zSlices,
          index: options.selection.zIndex,
          onIndexChange: (zIndex) => options.onSelectionChange({ zIndex }),
        }),
  });
}

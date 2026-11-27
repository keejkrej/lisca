import { UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  FrameNavigation,
  findNavigationOptionIndex,
  selectedAxisIndex,
  stepNavigationValue,
  toAxisNavigationOptions,
} from "@lisca/instrument";
import { clamp } from "@lisca/utils";
import { Schema } from "effect";

import { AlignPageStore, getAlignerState } from "../state/align-page-context";
import { selectAlignNav } from "../state/align-page-selectors";

const AlignFrameNavigationMessage = UiSchema.TaggedEnum({
  ChangePosition: { pos: Schema.Number },
  StepPosition: { delta: Schema.Number },
  ChangeChannel: { channel: Schema.Number },
  StepChannel: { delta: Schema.Number },
  ChangeTimeIndex: { index: Schema.Number },
  StepTimeIndex: { delta: Schema.Number },
  ChangeZIndex: { index: Schema.Number },
  StepZIndex: { delta: Schema.Number },
});

export const AlignFrameNavigation = Html.component({
  name: "AlignFrameNavigation",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: AlignFrameNavigationMessage,
  reads: {
    alignPage: AlignPageStore,
  },
}).make({
  init: () => ({}),
  update: {
    ChangePosition: ($, { pos }) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      state?.changePosition(pos);
      return $.model;
    },
    StepPosition: ($, { delta }) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (!state) return $.model;
      const options = toAxisNavigationOptions(
        state.scan?.positions ?? [],
        state.scan?.positionLabels,
      );
      const next = stepNavigationValue(options, state.selection.pos, delta < 0 ? -1 : 1);
      if (next != null) state.changePosition(next);
      return $.model;
    },
    ChangeChannel: ($, { channel }) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      state?.setSelection({ channel });
      return $.model;
    },
    StepChannel: ($, { delta }) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (!state) return $.model;
      const options = toAxisNavigationOptions(
        state.scan?.channels ?? [],
        state.scan?.channelLabels,
      );
      const next = stepNavigationValue(options, state.selection.channel, delta < 0 ? -1 : 1);
      if (next != null) state.setSelection({ channel: next });
      return $.model;
    },
    ChangeTimeIndex: ($, { index }) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (!state) return $.model;
      const times = state.scan?.times;
      const max = Math.max(0, (times?.length ?? 1) - 1);
      state.setSelection({ time: times?.[clamp(Math.round(index), 0, max)] ?? 0 });
      return $.model;
    },
    StepTimeIndex: ($, { delta }) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (!state) return $.model;
      const times = state.scan?.times;
      const max = Math.max(0, (times?.length ?? 1) - 1);
      const currentIdx = clamp(selectedAxisIndex(times, state.selection.time), 0, max);
      const nextIdx = clamp(currentIdx + delta, 0, max);
      state.setSelection({ time: times?.[nextIdx] ?? 0 });
      return $.model;
    },
    ChangeZIndex: ($, { index }) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (!state) return $.model;
      const zSlices = state.scan?.zSlices;
      const max = Math.max(0, (zSlices?.length ?? 1) - 1);
      state.setSelection({ z: zSlices?.[clamp(Math.round(index), 0, max)] ?? 0 });
      return $.model;
    },
    StepZIndex: ($, { delta }) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (!state) return $.model;
      const zSlices = state.scan?.zSlices;
      const max = Math.max(0, (zSlices?.length ?? 1) - 1);
      const currentIdx = clamp(selectedAxisIndex(zSlices, state.selection.z), 0, max);
      const nextIdx = clamp(currentIdx + delta, 0, max);
      state.setSelection({ z: zSlices?.[nextIdx] ?? 0 });
      return $.model;
    },
  },
  view: (h) => {
    void h.reads.alignPage.version;
    const state = getAlignerState(h.reads.alignPage.controllerId);
    if (!state) return View.text("");

    const nav = selectAlignNav(state);
    const disabled = !nav.scan;
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

    const timeMax = Math.max(0, (nav.scan?.times?.length ?? 1) - 1);
    const clampedTimeIndex = clamp(timeIndex, 0, timeMax);
    const timeValueLabel = (() => {
      const axisValues = nav.scan?.times;
      if (!axisValues || axisValues.length === 0) return undefined;
      const displayValue =
        nav.scan?.timeLabels?.[clampedTimeIndex] ?? String(axisValues[clampedTimeIndex]);
      return `${displayValue} (${clampedTimeIndex + 1}/${axisValues.length})`;
    })();

    const zMax = Math.max(0, (nav.scan?.zSlices?.length ?? 1) - 1);
    const clampedZIndex = clamp(zIndex, 0, zMax);
    const zValueLabel = (() => {
      const axisValues = nav.scan?.zSlices;
      if (!axisValues || axisValues.length === 0) return undefined;
      const displayValue =
        nav.scan?.zSliceLabels?.[clampedZIndex] ?? String(axisValues[clampedZIndex]);
      return `${displayValue} (${clampedZIndex + 1}/${axisValues.length})`;
    })();

    return FrameNavigation(h, {
      sectionAppearance: "rail",
      position: {
        value: nav.selection.pos,
        options: positionOptions,
        disabled,
        onChange: (pos) => AlignFrameNavigationMessage.ChangePosition({ pos }),
        previousDisabled: disabled || posIndex <= 0,
        nextDisabled: disabled || posIndex >= positionOptions.length - 1,
        onPrevious: AlignFrameNavigationMessage.StepPosition({ delta: -1 }),
        onNext: AlignFrameNavigationMessage.StepPosition({ delta: 1 }),
      },
      channel: {
        value: nav.selection.channel,
        options: channelOptions,
        disabled,
        onChange: (channel) => AlignFrameNavigationMessage.ChangeChannel({ channel }),
        previousDisabled: disabled || chIndex <= 0,
        nextDisabled: disabled || chIndex >= channelOptions.length - 1,
        onPrevious: AlignFrameNavigationMessage.StepChannel({ delta: -1 }),
        onNext: AlignFrameNavigationMessage.StepChannel({ delta: 1 }),
      },
      frame: {
        value: clampedTimeIndex,
        min: 0,
        max: timeMax,
        step: 1,
        valueLabel: timeValueLabel,
        axisValues: nav.scan?.times,
        axisLabels: nav.scan?.timeLabels,
        disabled: disabled || timeMax <= 0,
        previousDisabled: disabled || clampedTimeIndex <= 0,
        nextDisabled: disabled || clampedTimeIndex >= timeMax,
        onChange: (nextValue) => AlignFrameNavigationMessage.ChangeTimeIndex({ index: nextValue }),
        onCommit: (nextValue) => AlignFrameNavigationMessage.ChangeTimeIndex({ index: nextValue }),
        onPrevious: AlignFrameNavigationMessage.StepTimeIndex({ delta: -1 }),
        onNext: AlignFrameNavigationMessage.StepTimeIndex({ delta: 1 }),
      },
      zPlane: {
        value: clampedZIndex,
        min: 0,
        max: zMax,
        step: 1,
        valueLabel: zValueLabel,
        axisValues: nav.scan?.zSlices,
        axisLabels: nav.scan?.zSliceLabels,
        disabled: disabled || zMax <= 0,
        previousDisabled: disabled || clampedZIndex <= 0,
        nextDisabled: disabled || clampedZIndex >= zMax,
        onChange: (nextValue) => AlignFrameNavigationMessage.ChangeZIndex({ index: nextValue }),
        onCommit: (nextValue) => AlignFrameNavigationMessage.ChangeZIndex({ index: nextValue }),
        onPrevious: AlignFrameNavigationMessage.StepZIndex({ delta: -1 }),
        onNext: AlignFrameNavigationMessage.StepZIndex({ delta: 1 }),
      },
    });
  },
});

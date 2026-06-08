import {
  AnnotatorContrastRail,
  FrameNavigation,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
} from "@lisca/ui/features";
import { clamp } from "@lisca/utils";
import { useMemo } from "react";

import { useAnnotatePage } from "../state/annotate-page-context";

export function AnnotatorLeft() {
  const { state } = useAnnotatePage();
  const positionOptions = useMemo(
    () => toNavigationOptions(state.scan?.positions.map((entry) => entry.pos) ?? []),
    [state.scan],
  );
  const roiOptions = useMemo(
    () =>
      state.position?.rois.map((entry) => ({ value: entry.roi, label: String(entry.roi) })) ?? [],
    [state.position],
  );
  const channelOptions = useMemo(
    () => toNavigationOptions(state.position?.channels ?? []),
    [state.position],
  );
  const timeMax = Math.max(0, (state.position?.times.length ?? 1) - 1);
  const zMax = Math.max(0, (state.position?.zSlices.length ?? 1) - 1);

  const posValue = state.selection.pos ?? positionOptions[0]?.value ?? 0;
  const roiValue = state.selection.roi ?? roiOptions[0]?.value ?? 0;
  const channelValue = state.selection.channel ?? channelOptions[0]?.value ?? 0;

  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <FrameNavigation
        position={{
          value: posValue,
          options: positionOptions,
          disabled: positionOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(positionOptions, posValue) <= 0,
          nextDisabled:
            findNavigationOptionIndex(positionOptions, posValue) >= positionOptions.length - 1,
          onChange: (value) => state.changeSelection(() => state.setSelection({ pos: value, roi: null })),
          onPrevious: () => {
            const next = stepNavigationValue(positionOptions, posValue, -1);
            if (next != null) state.changeSelection(() => state.setSelection({ pos: next, roi: null }));
          },
          onNext: () => {
            const next = stepNavigationValue(positionOptions, posValue, 1);
            if (next != null) state.changeSelection(() => state.setSelection({ pos: next, roi: null }));
          },
        }}
        roi={{
          value: roiValue,
          options: roiOptions,
          disabled: roiOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(roiOptions, roiValue) <= 0,
          nextDisabled: findNavigationOptionIndex(roiOptions, roiValue) >= roiOptions.length - 1,
          onChange: (value) => state.changeSelection(() => state.setSelection({ roi: value })),
          onPrevious: () => {
            const next = stepNavigationValue(roiOptions, roiValue, -1);
            if (next != null) state.changeSelection(() => state.setSelection({ roi: next }));
          },
          onNext: () => {
            const next = stepNavigationValue(roiOptions, roiValue, 1);
            if (next != null) state.changeSelection(() => state.setSelection({ roi: next }));
          },
        }}
        channel={{
          value: channelValue,
          options: channelOptions,
          disabled: channelOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(channelOptions, channelValue) <= 0,
          nextDisabled:
            findNavigationOptionIndex(channelOptions, channelValue) >= channelOptions.length - 1,
          onChange: (value) => state.changeSelection(() => state.setSelection({ channel: value })),
          onPrevious: () => {
            const next = stepNavigationValue(channelOptions, channelValue, -1);
            if (next != null) state.changeSelection(() => state.setSelection({ channel: next }));
          },
          onNext: () => {
            const next = stepNavigationValue(channelOptions, channelValue, 1);
            if (next != null) state.changeSelection(() => state.setSelection({ channel: next }));
          },
        }}
        timepoint={{
          value: state.selection.timeIndex,
          min: 0,
          max: timeMax,
          step: 1,
          disabled: timeMax <= 0,
          previousDisabled: state.selection.timeIndex <= 0,
          nextDisabled: state.selection.timeIndex >= timeMax,
          onCommit: (value) =>
            state.changeSelection(() =>
              state.setSelection({ timeIndex: clamp(Math.round(value), 0, timeMax) }),
            ),
          onPrevious: () =>
            state.changeSelection(() =>
              state.setSelection({ timeIndex: Math.max(0, state.selection.timeIndex - 1) }),
            ),
          onNext: () =>
            state.changeSelection(() =>
              state.setSelection({ timeIndex: Math.min(timeMax, state.selection.timeIndex + 1) }),
            ),
        }}
        zPlane={{
          value: state.selection.zIndex,
          min: 0,
          max: zMax,
          step: 1,
          disabled: zMax <= 0,
          previousDisabled: state.selection.zIndex <= 0,
          nextDisabled: state.selection.zIndex >= zMax,
          onCommit: (value) =>
            state.changeSelection(() =>
              state.setSelection({ zIndex: clamp(Math.round(value), 0, zMax) }),
            ),
          onPrevious: () =>
            state.changeSelection(() =>
              state.setSelection({ zIndex: Math.max(0, state.selection.zIndex - 1) }),
            ),
          onNext: () =>
            state.changeSelection(() =>
              state.setSelection({ zIndex: Math.min(zMax, state.selection.zIndex + 1) }),
            ),
        }}
      />
      <AnnotatorContrastRail
        contrast={state.contrast}
        frame={state.frame}
        onContrastChange={state.setContrast}
      />
    </div>
  );
}

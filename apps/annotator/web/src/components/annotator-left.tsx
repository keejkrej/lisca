import {
  ContrastControl,
  createAxisIndexSliderControl,
  FrameNavigation,
  findNavigationOptionIndex,
  stepNavigationValue,
  toAxisNavigationOptions,
} from "@lisca/ui/features";
import { useAnnotatePage } from "../state/annotate-page-context";
export function AnnotatorLeft() {
  const { state } = useAnnotatePage();
  const positionOptions = toAxisNavigationOptions(
    state.scan?.positions.map((entry) => entry.pos) ?? [],
  );
  const roiOptions =
    state.position?.rois.map((entry) => ({
      value: entry.roi,
      label: String(entry.roi),
    })) ?? [];
  const channelOptions = toAxisNavigationOptions(state.position?.channels ?? []);
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
          onChange: (value) =>
            state.changeSelection(() =>
              state.setSelection({
                pos: value,
                roi: null,
              }),
            ),
          onPrevious: () => {
            const next = stepNavigationValue(positionOptions, posValue, -1);
            if (next != null)
              state.changeSelection(() =>
                state.setSelection({
                  pos: next,
                  roi: null,
                }),
              );
          },
          onNext: () => {
            const next = stepNavigationValue(positionOptions, posValue, 1);
            if (next != null)
              state.changeSelection(() =>
                state.setSelection({
                  pos: next,
                  roi: null,
                }),
              );
          },
        }}
        roi={{
          value: roiValue,
          options: roiOptions,
          disabled: roiOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(roiOptions, roiValue) <= 0,
          nextDisabled: findNavigationOptionIndex(roiOptions, roiValue) >= roiOptions.length - 1,
          onChange: (value) =>
            state.changeSelection(() =>
              state.setSelection({
                roi: value,
              }),
            ),
          onPrevious: () => {
            const next = stepNavigationValue(roiOptions, roiValue, -1);
            if (next != null)
              state.changeSelection(() =>
                state.setSelection({
                  roi: next,
                }),
              );
          },
          onNext: () => {
            const next = stepNavigationValue(roiOptions, roiValue, 1);
            if (next != null)
              state.changeSelection(() =>
                state.setSelection({
                  roi: next,
                }),
              );
          },
        }}
        channel={{
          value: channelValue,
          options: channelOptions,
          disabled: channelOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(channelOptions, channelValue) <= 0,
          nextDisabled:
            findNavigationOptionIndex(channelOptions, channelValue) >= channelOptions.length - 1,
          onChange: (value) =>
            state.changeSelection(() =>
              state.setSelection({
                channel: value,
              }),
            ),
          onPrevious: () => {
            const next = stepNavigationValue(channelOptions, channelValue, -1);
            if (next != null)
              state.changeSelection(() =>
                state.setSelection({
                  channel: next,
                }),
              );
          },
          onNext: () => {
            const next = stepNavigationValue(channelOptions, channelValue, 1);
            if (next != null)
              state.changeSelection(() =>
                state.setSelection({
                  channel: next,
                }),
              );
          },
        }}
        timepoint={createAxisIndexSliderControl({
          axisValues: state.position?.times,
          index: state.selection.timeIndex,
          onIndexChange: (timeIndex) =>
            state.changeSelection(() =>
              state.setSelection({
                timeIndex,
              }),
            ),
        })}
        zPlane={createAxisIndexSliderControl({
          axisValues: state.position?.zSlices,
          index: state.selection.zIndex,
          onIndexChange: (zIndex) =>
            state.changeSelection(() =>
              state.setSelection({
                zIndex,
              }),
            ),
        })}
      />
      <ContrastControl
        aria-label="Contrast"
        contrast={state.contrast}
        disabled={!state.frame}
        frame={state.frame}
        role="region"
        onContrastChange={state.setContrast}
      />
    </div>
  );
}

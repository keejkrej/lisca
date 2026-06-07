import { cn } from "@lisca/ui";
import {
  ContrastControl,
  FrameNavigation,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
} from "@lisca/ui/features";
import { shellRailChromeClass } from "@lisca/ui/shell";
import { clamp } from "@lisca/utils";
import { useMemo } from "react";

import { useRoiPage } from "../state/roi-page-context";

export function AnnotatorLeft() {
  const { page } = useRoiPage();
  const positionOptions = useMemo(
    () => toNavigationOptions(page.scan?.positions.map((entry) => entry.pos) ?? []),
    [page.scan],
  );
  const roiOptions = useMemo(
    () =>
      page.position?.rois.map((entry) => ({ value: entry.roi, label: String(entry.roi) })) ?? [],
    [page.position],
  );
  const channelOptions = useMemo(
    () => toNavigationOptions(page.position?.channels ?? []),
    [page.position],
  );
  const timeMax = Math.max(0, (page.position?.times.length ?? 1) - 1);
  const zMax = Math.max(0, (page.position?.zSlices.length ?? 1) - 1);

  const posValue = page.selection.pos ?? positionOptions[0]?.value ?? 0;
  const roiValue = page.selection.roi ?? roiOptions[0]?.value ?? 0;
  const channelValue = page.selection.channel ?? channelOptions[0]?.value ?? 0;

  return (
    <div className={cn("flex min-h-0 flex-col gap-2 p-3", shellRailChromeClass)}>
      <FrameNavigation
        position={{
          value: posValue,
          options: positionOptions,
          disabled: positionOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(positionOptions, posValue) <= 0,
          nextDisabled:
            findNavigationOptionIndex(positionOptions, posValue) >= positionOptions.length - 1,
          onChange: (value) => page.changeSelection(() => page.setSelection({ pos: value, roi: null })),
          onPrevious: () => {
            const next = stepNavigationValue(positionOptions, posValue, -1);
            if (next != null) page.changeSelection(() => page.setSelection({ pos: next, roi: null }));
          },
          onNext: () => {
            const next = stepNavigationValue(positionOptions, posValue, 1);
            if (next != null) page.changeSelection(() => page.setSelection({ pos: next, roi: null }));
          },
        }}
        roi={{
          value: roiValue,
          options: roiOptions,
          disabled: roiOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(roiOptions, roiValue) <= 0,
          nextDisabled: findNavigationOptionIndex(roiOptions, roiValue) >= roiOptions.length - 1,
          onChange: (value) => page.changeSelection(() => page.setSelection({ roi: value })),
          onPrevious: () => {
            const next = stepNavigationValue(roiOptions, roiValue, -1);
            if (next != null) page.changeSelection(() => page.setSelection({ roi: next }));
          },
          onNext: () => {
            const next = stepNavigationValue(roiOptions, roiValue, 1);
            if (next != null) page.changeSelection(() => page.setSelection({ roi: next }));
          },
        }}
        channel={{
          value: channelValue,
          options: channelOptions,
          disabled: channelOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(channelOptions, channelValue) <= 0,
          nextDisabled:
            findNavigationOptionIndex(channelOptions, channelValue) >= channelOptions.length - 1,
          onChange: (value) => page.changeSelection(() => page.setSelection({ channel: value })),
          onPrevious: () => {
            const next = stepNavigationValue(channelOptions, channelValue, -1);
            if (next != null) page.changeSelection(() => page.setSelection({ channel: next }));
          },
          onNext: () => {
            const next = stepNavigationValue(channelOptions, channelValue, 1);
            if (next != null) page.changeSelection(() => page.setSelection({ channel: next }));
          },
        }}
        timepoint={{
          value: page.selection.timeIndex,
          min: 0,
          max: timeMax,
          step: 1,
          disabled: timeMax <= 0,
          previousDisabled: page.selection.timeIndex <= 0,
          nextDisabled: page.selection.timeIndex >= timeMax,
          onCommit: (value) =>
            page.changeSelection(() =>
              page.setSelection({ timeIndex: clamp(Math.round(value), 0, timeMax) }),
            ),
          onPrevious: () =>
            page.changeSelection(() =>
              page.setSelection({ timeIndex: Math.max(0, page.selection.timeIndex - 1) }),
            ),
          onNext: () =>
            page.changeSelection(() =>
              page.setSelection({ timeIndex: Math.min(timeMax, page.selection.timeIndex + 1) }),
            ),
        }}
        zPlane={{
          value: page.selection.zIndex,
          min: 0,
          max: zMax,
          step: 1,
          disabled: zMax <= 0,
          previousDisabled: page.selection.zIndex <= 0,
          nextDisabled: page.selection.zIndex >= zMax,
          onCommit: (value) =>
            page.changeSelection(() =>
              page.setSelection({ zIndex: clamp(Math.round(value), 0, zMax) }),
            ),
          onPrevious: () =>
            page.changeSelection(() =>
              page.setSelection({ zIndex: Math.max(0, page.selection.zIndex - 1) }),
            ),
          onNext: () =>
            page.changeSelection(() =>
              page.setSelection({ zIndex: Math.min(zMax, page.selection.zIndex + 1) }),
            ),
        }}
      />
      <ContrastControl
        domainMax={page.contrastDomain.max}
        domainMin={page.contrastDomain.min}
        maxValue={page.contrastMax}
        minValue={page.contrastMin}
        onAutoRange={() =>
          page.setContrast({ min: page.contrastDomain.min, max: page.contrastDomain.max })
        }
        onMaxCommit={(max) => page.setContrast({ min: page.contrastMin, max })}
        onMinCommit={(min) => page.setContrast({ min, max: page.contrastMax })}
      />
    </div>
  );
}

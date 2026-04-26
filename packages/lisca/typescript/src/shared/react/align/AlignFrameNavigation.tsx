import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { clamp, coerceSelection } from "lisca/shared/core";

import {
  AlignStoreProvider,
  patchAlignState,
  setAlignTimeSliderIndex,
  useAlignStoreApi,
  type AlignStore,
} from "./alignStore";
import {
  NavigationControls,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
} from "../NavigationControls";
import { SidebarSection } from "../sidebar";

function setSelectionKey<K extends "pos" | "channel" | "time" | "z">(
  store: AlignStore,
  key: K,
  value: NonNullable<ReturnType<AlignStore["getState"]>["selection"]>[K],
) {
  store.setState((state) => {
    if (!state.selection) return state;
    return {
      ...state,
      selection: { ...state.selection, [key]: value },
      saveState: { type: "idle", message: null },
    };
  });
}

function AlignFrameNavigationInner() {
  const store = useAlignStoreApi();
  const { scan, selection } = useStore(
    store,
    useShallow((state) => ({
      scan: state.scan,
      selection: state.selection,
    })),
  );

  const positionOptions = useMemo(() => toNavigationOptions(scan?.positions ?? []), [scan]);
  const channelOptions = useMemo(() => toNavigationOptions(scan?.channels ?? []), [scan]);
  const zValues = scan?.zSlices ?? [];
  const timeValues = scan?.times ?? [];

  const selectedPosition = selection?.pos ?? positionOptions[0]?.value ?? null;
  const selectedChannel = selection?.channel ?? channelOptions[0]?.value ?? null;
  const selectedPositionIndex = findNavigationOptionIndex(positionOptions, selectedPosition);
  const selectedChannelIndex = findNavigationOptionIndex(channelOptions, selectedChannel);

  const selectedZIndex = useMemo(() => {
    if (!selection) return 0;
    const index = zValues.indexOf(selection.z);
    return index >= 0 ? index : 0;
  }, [selection, zValues]);

  const selectedTimeIndex = useMemo(() => {
    if (!selection) return 0;
    const index = timeValues.indexOf(selection.time);
    return index >= 0 ? index : 0;
  }, [selection, timeValues]);

  const timeSliderIndex = useStore(store, (s) => s.timeSliderIndex);
  const [zSliderIndex, setZSliderIndex] = useState(0);

  useEffect(() => {
    setAlignTimeSliderIndex(store, selectedTimeIndex);
  }, [selectedTimeIndex, store]);

  useEffect(() => {
    setZSliderIndex(selectedZIndex);
  }, [selectedZIndex]);

  const controlsDisabled = !scan || scan.positions.length === 0 || !selection;
  const timeSliderMax = Math.max(0, timeValues.length - 1);
  const displayedTime = timeValues[timeSliderIndex] ?? selection?.time ?? 0;
  const zSliderMax = Math.max(0, zValues.length - 1);
  const displayedZ = zValues[zSliderIndex] ?? selection?.z ?? 0;

  return (
    <SidebarSection title="Frame">
      <NavigationControls
        position={{
          value: selection?.pos ?? (positionOptions[0]?.value ?? 0),
          options: positionOptions,
          disabled: controlsDisabled,
          onChange: (value) => setSelectionKey(store, "pos", value),
          previousDisabled: controlsDisabled || selectedPositionIndex <= 0,
          nextDisabled: controlsDisabled || selectedPositionIndex >= positionOptions.length - 1,
          onPrevious: () => {
            const nextValue = stepNavigationValue(positionOptions, selectedPosition, -1);
            if (nextValue != null && nextValue !== selection?.pos) {
              setSelectionKey(store, "pos", nextValue);
            }
          },
          onNext: () => {
            const nextValue = stepNavigationValue(positionOptions, selectedPosition, 1);
            if (nextValue != null && nextValue !== selection?.pos) {
              setSelectionKey(store, "pos", nextValue);
            }
          },
        }}
        channel={{
          value: selection?.channel ?? (channelOptions[0]?.value ?? 0),
          options: channelOptions,
          disabled: controlsDisabled,
          onChange: (value) => setSelectionKey(store, "channel", value),
          previousDisabled: controlsDisabled || selectedChannelIndex <= 0,
          nextDisabled: controlsDisabled || selectedChannelIndex >= channelOptions.length - 1,
          onPrevious: () => {
            const nextValue = stepNavigationValue(channelOptions, selectedChannel, -1);
            if (nextValue != null && nextValue !== selection?.channel) {
              setSelectionKey(store, "channel", nextValue);
            }
          },
          onNext: () => {
            const nextValue = stepNavigationValue(channelOptions, selectedChannel, 1);
            if (nextValue != null && nextValue !== selection?.channel) {
              setSelectionKey(store, "channel", nextValue);
            }
          },
        }}
        timepoint={{
          hint: String(displayedTime),
          value: timeSliderIndex,
          min: 0,
          max: timeSliderMax,
          step: 1,
          disabled: controlsDisabled || timeValues.length <= 1,
          onChange: (nextIndex) =>
            setAlignTimeSliderIndex(store, clamp(Math.round(nextIndex), 0, timeSliderMax)),
          onCommit: (nextIndex) => {
            const rounded = clamp(Math.round(nextIndex), 0, timeSliderMax);
            setAlignTimeSliderIndex(store, rounded);
            const nextTime = timeValues[rounded];
            if (nextTime != null && nextTime !== selection?.time) {
              setSelectionKey(store, "time", nextTime);
            }
          },
          previousDisabled: controlsDisabled || timeValues.length <= 1 || timeSliderIndex <= 0,
          nextDisabled:
            controlsDisabled || timeValues.length <= 1 || timeSliderIndex >= timeSliderMax,
          onPrevious: () => {
            const nextIndex = Math.max(0, timeSliderIndex - 1);
            setAlignTimeSliderIndex(store, nextIndex);
            const nextTime = timeValues[nextIndex];
            if (nextTime != null && nextTime !== selection?.time) {
              setSelectionKey(store, "time", nextTime);
            }
          },
          onNext: () => {
            const nextIndex = Math.min(timeSliderMax, timeSliderIndex + 1);
            setAlignTimeSliderIndex(store, nextIndex);
            const nextTime = timeValues[nextIndex];
            if (nextTime != null && nextTime !== selection?.time) {
              setSelectionKey(store, "time", nextTime);
            }
          },
        }}
        zPlane={{
          hint: String(displayedZ),
          value: zSliderIndex,
          min: 0,
          max: zSliderMax,
          step: 1,
          disabled: controlsDisabled || zValues.length <= 1,
          onChange: (nextIndex) => setZSliderIndex(clamp(Math.round(nextIndex), 0, zSliderMax)),
          onCommit: (nextIndex) => {
            const rounded = clamp(Math.round(nextIndex), 0, zSliderMax);
            setZSliderIndex(rounded);
            const nextZ = zValues[rounded];
            if (nextZ != null && nextZ !== selection?.z && selection && scan) {
              patchAlignState(store, {
                selection: coerceSelection(scan, {
                  ...selection,
                  z: nextZ,
                }),
              });
            }
          },
          previousDisabled: controlsDisabled || zValues.length <= 1 || zSliderIndex <= 0,
          nextDisabled: controlsDisabled || zValues.length <= 1 || zSliderIndex >= zSliderMax,
          onPrevious: () => {
            const nextIndex = Math.max(0, zSliderIndex - 1);
            setZSliderIndex(nextIndex);
            const nextZ = zValues[nextIndex];
            if (nextZ != null && selection && scan) {
              patchAlignState(store, {
                selection: coerceSelection(scan, {
                  ...selection,
                  z: nextZ,
                }),
              });
            }
          },
          onNext: () => {
            const nextIndex = Math.min(zSliderMax, zSliderIndex + 1);
            setZSliderIndex(nextIndex);
            const nextZ = zValues[nextIndex];
            if (nextZ != null && selection && scan) {
              patchAlignState(store, {
                selection: coerceSelection(scan, {
                  ...selection,
                  z: nextZ,
                }),
              });
            }
          },
        }}
      />
    </SidebarSection>
  );
}

export function AlignFrameNavigation({ store }: { store?: AlignStore }) {
  if (store) {
    return (
      <AlignStoreProvider store={store}>
        <AlignFrameNavigationInner />
      </AlignStoreProvider>
    );
  }

  return <AlignFrameNavigationInner />;
}

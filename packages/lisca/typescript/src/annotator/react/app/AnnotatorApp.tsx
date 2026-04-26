import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type {
  AnnotationLabel,
  FrameResult,
  RawFrameAnnotation,
  RawFrameRequest,
  RoiFrameAnnotation,
  RoiFrameRequest,
  RoiPositionScan,
  ViewerDataPort,
  ViewerHostPort,
  ViewerSelection,
  ViewerSource,
} from "lisca/shared/contracts";
import { clamp, makeSourceKey } from "lisca/shared/core";
import {
  AnchoredToastProvider,
  findNavigationOptionIndex,
  NavigationControls,
  prefetchAnnotationMetaForEditor,
  SelectStepperField,
  showErrorToast,
  SidebarSection,
  ToastProvider,
  toErrorMessage,
  toNavigationOptions,
  useSyncRawAnnotationSourceQueryToRawStores,
  useSyncRawScanQueryToRawStore,
  useSyncRoiWorkspaceQueryToRoiStore,
} from "lisca/shared/react";
import {
  prefetchAnnotatorWorkspaceShell,
  useAnnotationLabelsQuery,
  useRawAnnotationSourceQuery,
  useSaveAnnotationLabelsMutation,
  useScanRoiWorkspaceQuery,
  useScanSourceQuery,
} from "lisca/shared/query";
import {
  rawStore,
  resetRawState,
  resetRoiState,
  roiStore,
  setRawSelectionKey,
  setRawSource,
  setRoiSelectionKey,
  setSelectedRoi,
  setWorkspacePath,
  workspaceStore,
} from "lisca/shared/state";

import {
  AnnotationLabelManagerDialog,
  createEmptyMask,
  RoiAnnotationCanvasPanel,
  RoiAnnotationDiscardDialog,
  RoiAnnotationProvider,
  RoiAnnotationToolbar,
} from "../annotation";
import { RawAnnotationSession, RoiAnnotationSession } from "../session";

import AnnotatorNavbar, { type AnnotatorDataMode } from "./AnnotatorNavbar";
import AnnotatorOutputsSection from "./AnnotatorOutputsSection";
import { useAnnotationModeStore } from "./annotationModeStore";
import { useLoadAnnotatorEditorFrame } from "../hooks/useLoadAnnotatorEditorFrame";

const SHELL_ANNOTATION_FRAME: FrameResult = {
  width: 1,
  height: 1,
  pixels: new Uint8Array(1),
};

const LAST_DATA_MODE_KEY = "annotator.dataMode";

function currentPositionScan(scan: { positions: RoiPositionScan[] } | null, pos: number | null) {
  if (!scan || pos == null) return null;
  return scan.positions.find((entry) => entry.pos === pos) ?? null;
}

function readStoredDataMode(): AnnotatorDataMode {
  if (typeof window === "undefined" || !window.sessionStorage) return "roi";
  return window.sessionStorage.getItem(LAST_DATA_MODE_KEY) === "raw" ? "raw" : "roi";
}

function sourcesEqual(left: ViewerSource | null, right: ViewerSource | null) {
  if (!left || !right) return left === right;
  return left.kind === right.kind && left.path === right.path;
}

interface AnnotatorAppProps {
  dataPort: ViewerDataPort;
  hostPort: ViewerHostPort;
}

export default function AnnotatorApp({ dataPort: backend, hostPort }: AnnotatorAppProps) {
  const queryClient = useQueryClient();
  const saveAnnotationLabelsMutation = useSaveAnnotationLabelsMutation(backend);
  const workspacePath = useStore(workspaceStore, (state) => state.workspacePath);
  const annotationMode = useAnnotationModeStore((state) => state.mode);
  const setAnnotationMode = useAnnotationModeStore((state) => state.setMode);
  const [dataMode, setDataMode] = useState<AnnotatorDataMode>(() => readStoredDataMode());

  const { scan, selection, loading, error, selectedRoi } = useStore(
    roiStore,
    useShallow((state) => ({
      scan: state.scan,
      selection: state.selection,
      loading: state.loading,
      error: state.error,
      selectedRoi: state.selectedRoi,
    })),
  );

  const rawState = useStore(
    rawStore,
    useShallow((state) => ({
      source: state.source,
      boundSource: state.boundSource,
      scan: state.scan,
      selection: state.selection,
      loading: state.loading,
      error: state.error,
    })),
  );

  const roiWorkspaceQuery = useScanRoiWorkspaceQuery(backend, workspacePath);
  const labelsQuery = useAnnotationLabelsQuery(backend, workspacePath);
  const rawBoundQuery = useRawAnnotationSourceQuery(backend, workspacePath);
  const rawScanQuery = useScanSourceQuery(backend, rawState.source, {
    enabled: dataMode === "raw" && Boolean(workspacePath && rawState.source),
  });

  const lastBoundSyncKey = useRef<string | null>(null);

  useSyncRoiWorkspaceQueryToRoiStore(workspacePath, roiWorkspaceQuery);
  useSyncRawAnnotationSourceQueryToRawStores(workspacePath, rawBoundQuery, lastBoundSyncKey);
  useSyncRawScanQueryToRawStore(dataMode, workspacePath, rawState.source, rawScanQuery);

  const annotationLabels = labelsQuery.data ?? null;
  const annotationLabelsLoading = labelsQuery.isPending;
  const annotationLabelsError = labelsQuery.error ? toErrorMessage(labelsQuery.error) : null;

  const lastDataErrorToastRef = useRef<string | null>(null);
  const lastLabelsErrorToastRef = useRef<string | null>(null);

  const [roiTimeSliderIndex, setRoiTimeSliderIndex] = useState(0);
  const [roiZSliderIndex, setRoiZSliderIndex] = useState(0);
  const [rawTimeSliderIndex, setRawTimeSliderIndex] = useState(0);
  const [rawZSliderIndex, setRawZSliderIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.setItem(LAST_DATA_MODE_KEY, dataMode);
  }, [dataMode]);

  const activeDataError = dataMode === "roi" ? error : rawState.error;
  useEffect(() => {
    if (!activeDataError) {
      lastDataErrorToastRef.current = null;
      return;
    }
    if (lastDataErrorToastRef.current === activeDataError) return;
    lastDataErrorToastRef.current = activeDataError;
    showErrorToast(activeDataError);
  }, [activeDataError]);

  useEffect(() => {
    if (!annotationLabelsError) {
      lastLabelsErrorToastRef.current = null;
      return;
    }
    if (lastLabelsErrorToastRef.current === annotationLabelsError) return;
    lastLabelsErrorToastRef.current = annotationLabelsError;
    showErrorToast(annotationLabelsError);
  }, [annotationLabelsError]);

  useEffect(() => {
    if (!workspacePath) {
      resetRoiState();
      resetRawState();
      lastBoundSyncKey.current = null;
      return;
    }

    prefetchAnnotatorWorkspaceShell(queryClient, backend, workspacePath);
  }, [backend, queryClient, workspacePath]);

  const roiPosition = useMemo(
    () => currentPositionScan(scan, selection?.pos ?? null),
    [scan, selection?.pos],
  );
  const roiEntries = roiPosition?.rois ?? [];
  const selectedRoiEntry = useMemo(
    () => roiEntries.find((roi) => roi.roi === selectedRoi) ?? null,
    [roiEntries, selectedRoi],
  );

  const roiPositionOptions = useMemo(
    () => toNavigationOptions(scan?.positions.map((entry) => entry.pos) ?? []),
    [scan],
  );
  const roiChannelOptions = useMemo(
    () => toNavigationOptions(roiPosition?.channels ?? []),
    [roiPosition],
  );
  const roiZValues = roiPosition?.zSlices ?? [];
  const roiTimeValues = roiPosition?.times ?? [];
  const selectedRoiPositionIndex = findNavigationOptionIndex(
    roiPositionOptions,
    selection?.pos ?? roiPositionOptions[0]?.value ?? null,
  );
  const selectedRoiChannelIndex = findNavigationOptionIndex(
    roiChannelOptions,
    selection?.channel ?? roiChannelOptions[0]?.value ?? null,
  );
  const selectedRoiIndex = findNavigationOptionIndex(
    roiEntries.map((roi) => ({ label: `ROI ${roi.roi}`, value: roi.roi })),
    selectedRoi ?? roiEntries[0]?.roi ?? null,
  );

  const rawPositionOptions = useMemo(
    () => toNavigationOptions(rawState.scan?.positions ?? []),
    [rawState.scan],
  );
  const rawChannelOptions = useMemo(
    () => toNavigationOptions(rawState.scan?.channels ?? []),
    [rawState.scan],
  );
  const rawZValues = rawState.scan?.zSlices ?? [];
  const rawTimeValues = rawState.scan?.times ?? [];
  const selectedRawPositionIndex = findNavigationOptionIndex(
    rawPositionOptions,
    rawState.selection?.pos ?? rawPositionOptions[0]?.value ?? null,
  );
  const selectedRawChannelIndex = findNavigationOptionIndex(
    rawChannelOptions,
    rawState.selection?.channel ?? rawChannelOptions[0]?.value ?? null,
  );

  useEffect(() => {
    const index = roiTimeValues.indexOf(selection?.time ?? roiTimeValues[0] ?? 0);
    setRoiTimeSliderIndex(index >= 0 ? index : 0);
  }, [roiTimeValues, selection?.time]);

  useEffect(() => {
    const index = roiZValues.indexOf(selection?.z ?? roiZValues[0] ?? 0);
    setRoiZSliderIndex(index >= 0 ? index : 0);
  }, [roiZValues, selection?.z]);

  useEffect(() => {
    const index = rawTimeValues.indexOf(rawState.selection?.time ?? rawTimeValues[0] ?? 0);
    setRawTimeSliderIndex(index >= 0 ? index : 0);
  }, [rawState.selection?.time, rawTimeValues]);

  useEffect(() => {
    const index = rawZValues.indexOf(rawState.selection?.z ?? rawZValues[0] ?? 0);
    setRawZSliderIndex(index >= 0 ? index : 0);
  }, [rawState.selection?.z, rawZValues]);

  useEffect(() => {
    if (roiEntries.length === 0) {
      if (selectedRoi != null) setSelectedRoi(null);
      return;
    }
    if (selectedRoi == null || !roiEntries.some((roi) => roi.roi === selectedRoi)) {
      setSelectedRoi(roiEntries[0]?.roi ?? null);
    }
  }, [roiEntries, selectedRoi]);

  const roiRequest = useMemo((): RoiFrameRequest | null => {
    if (!selection || !selectedRoiEntry) return null;
    return {
      pos: selection.pos,
      roi: selectedRoiEntry.roi,
      channel: selection.channel,
      time: selection.time,
      z: selection.z,
    };
  }, [selectedRoiEntry, selection]);

  const rawRequest = useMemo((): RawFrameRequest | null => {
    if (!rawState.selection) return null;
    return {
      pos: rawState.selection.pos,
      channel: rawState.selection.channel,
      time: rawState.selection.time,
      z: rawState.selection.z,
    };
  }, [rawState.selection]);

  const frameLoadKey = useMemo(() => {
    if (dataMode === "roi") {
      if (!roiRequest) return null;
      return `roi:${roiRequest.pos}:${roiRequest.roi}:${roiRequest.channel}:${roiRequest.time}:${roiRequest.z}`;
    }
    if (!rawRequest || !rawState.source) return null;
    return `raw:${makeSourceKey(rawState.source)}:${rawRequest.pos}:${rawRequest.channel}:${rawRequest.time}:${rawRequest.z}`;
  }, [dataMode, rawRequest, rawState.source, roiRequest]);

  const prefetchEditorAnnotationMeta = useCallback(() => {
    if (!workspacePath) return;
    prefetchAnnotationMetaForEditor(
      queryClient,
      backend,
      workspacePath,
      dataMode,
      roiRequest,
      rawState.source,
      rawRequest,
    );
  }, [backend, dataMode, queryClient, rawRequest, rawState.source, roiRequest, workspacePath]);

  const { editorFrame, editorFrameLoading, editorFrameError } = useLoadAnnotatorEditorFrame({
    backend,
    workspacePath,
    frameLoadKey,
    dataMode,
    roiRequest,
    rawSource: rawState.source,
    rawRequest,
    onFrameLoaded: prefetchEditorAnnotationMeta,
  });

  const handlePickWorkspace = async () => {
    const selected = await hostPort.pickWorkspace();
    if (selected) setWorkspacePath(selected);
  };

  const handleOpenSource = async (sourceLoader: () => Promise<string | null>, kind: ViewerSource["kind"]) => {
    if (!workspacePath) return;
    const selected = await sourceLoader();
    if (!selected) return;
    const nextSource = { kind, path: selected } as ViewerSource;
    if (rawState.boundSource && !sourcesEqual(rawState.boundSource, nextSource)) {
      showErrorToast(
        `This workspace is already bound to ${rawState.boundSource.path}. Choose that source or a different workspace.`,
      );
      return;
    }
    setRawSource(nextSource);
  };

  const handleCloseSession = () => {
    resetRoiState();
    resetRawState();
    setWorkspacePath(null);
  };

  const roiEmptyText = useMemo(() => {
    if (loading) return "Scanning workspace ROI output...";
    if (error) return error;
    return null;
  }, [error, loading]);

  const rawEmptyText = useMemo(() => {
    if (!workspacePath) return "Open a workspace folder.";
    if (!rawState.source) return "Choose a source to annotate raw frames.";
    if (rawState.loading) return "Scanning source…";
    if (rawState.error) return rawState.error;
    if (!rawState.selection) return "No frames in this source.";
    return null;
  }, [rawState.error, rawState.loading, rawState.selection, rawState.source, workspacePath]);

  const annotationRailFallbackSubtitle = useMemo(() => {
    if (dataMode === "roi") {
      if (!workspacePath) return "Open a workspace folder.";
      if (loading) return "Scanning ROI output…";
      if (error) return error;
      if (roiEntries.length === 0) return "No ROIs in this workspace.";
      return "Choose a ROI and stack.";
    }
    if (!workspacePath) return "Open a workspace folder.";
    if (!rawState.source) return "Choose a source.";
    if (rawState.loading) return "Scanning source…";
    if (rawState.error) return rawState.error;
    return "Choose a frame.";
  }, [dataMode, error, loading, rawState.error, rawState.loading, rawState.source, roiEntries.length, workspacePath]);

  const shellProviderLoading =
    Boolean(workspacePath) &&
    (annotationLabelsLoading || (dataMode === "roi" ? loading : rawState.loading));

  const shellInitialMask = useMemo(() => createEmptyMask(1, 1), []);
  const annotationFrameReady = Boolean(editorFrame && !editorFrameLoading && !editorFrameError);

  const displayFrame = dataMode === "roi" && selectedRoiEntry
    ? annotationFrameReady && editorFrame
      ? editorFrame
      : {
          width: selectedRoiEntry.bbox.w,
          height: selectedRoiEntry.bbox.h,
          pixels: new Uint8Array(selectedRoiEntry.bbox.w * selectedRoiEntry.bbox.h),
        }
    : annotationFrameReady && editorFrame
      ? editorFrame
      : SHELL_ANNOTATION_FRAME;

  const canMountRoiUi = Boolean(
    workspacePath && roiEmptyText === null && selectedRoiEntry && roiRequest,
  );
  const canMountRawUi = Boolean(
    workspacePath && rawEmptyText === null && rawState.source && rawRequest,
  );

  const renderRoiStack = () => {
    const controlsDisabled = !selection || !roiPosition || roiEntries.length === 0;
    const timeSliderMax = Math.max(0, roiTimeValues.length - 1);
    const zSliderMax = Math.max(0, roiZValues.length - 1);
    const roiOptions = roiEntries.map((roi) => ({ label: `ROI ${roi.roi}`, value: roi.roi }));

    return (
      <SidebarSection title="ROI Stack">
        <NavigationControls
          position={{
            value: selection?.pos ?? (roiPositionOptions[0]?.value ?? 0),
            options: roiPositionOptions,
            disabled: !selection,
            onChange: (value) => setRoiSelectionKey("pos", value),
            previousDisabled: !selection || selectedRoiPositionIndex <= 0,
            nextDisabled: !selection || selectedRoiPositionIndex >= roiPositionOptions.length - 1,
            onPrevious: () => {
              const nextValue = roiPositionOptions[selectedRoiPositionIndex - 1]?.value;
              if (nextValue != null) setRoiSelectionKey("pos", nextValue);
            },
            onNext: () => {
              const nextValue = roiPositionOptions[selectedRoiPositionIndex + 1]?.value;
              if (nextValue != null) setRoiSelectionKey("pos", nextValue);
            },
          }}
          channel={{
            value: selection?.channel ?? (roiChannelOptions[0]?.value ?? 0),
            options: roiChannelOptions,
            disabled: controlsDisabled,
            onChange: (value) => setRoiSelectionKey("channel", value),
            previousDisabled: controlsDisabled || selectedRoiChannelIndex <= 0,
            nextDisabled: controlsDisabled || selectedRoiChannelIndex >= roiChannelOptions.length - 1,
            onPrevious: () => {
              const nextValue = roiChannelOptions[selectedRoiChannelIndex - 1]?.value;
              if (nextValue != null) setRoiSelectionKey("channel", nextValue);
            },
            onNext: () => {
              const nextValue = roiChannelOptions[selectedRoiChannelIndex + 1]?.value;
              if (nextValue != null) setRoiSelectionKey("channel", nextValue);
            },
          }}
          timepoint={{
            hint: String(roiTimeValues[roiTimeSliderIndex] ?? selection?.time ?? 0),
            value: roiTimeSliderIndex,
            min: 0,
            max: timeSliderMax,
            step: 1,
            disabled: controlsDisabled || roiTimeValues.length <= 1,
            onChange: (nextIndex) => setRoiTimeSliderIndex(clamp(Math.round(nextIndex), 0, timeSliderMax)),
            onCommit: (nextIndex) => {
              const rounded = clamp(Math.round(nextIndex), 0, timeSliderMax);
              setRoiTimeSliderIndex(rounded);
              const nextTime = roiTimeValues[rounded];
              if (nextTime != null) setRoiSelectionKey("time", nextTime);
            },
            previousDisabled: controlsDisabled || roiTimeValues.length <= 1 || roiTimeSliderIndex <= 0,
            nextDisabled: controlsDisabled || roiTimeValues.length <= 1 || roiTimeSliderIndex >= timeSliderMax,
            onPrevious: () => {
              const nextIndex = Math.max(0, roiTimeSliderIndex - 1);
              setRoiTimeSliderIndex(nextIndex);
              const nextTime = roiTimeValues[nextIndex];
              if (nextTime != null) setRoiSelectionKey("time", nextTime);
            },
            onNext: () => {
              const nextIndex = Math.min(timeSliderMax, roiTimeSliderIndex + 1);
              setRoiTimeSliderIndex(nextIndex);
              const nextTime = roiTimeValues[nextIndex];
              if (nextTime != null) setRoiSelectionKey("time", nextTime);
            },
          }}
          zPlane={{
            hint: String(roiZValues[roiZSliderIndex] ?? selection?.z ?? 0),
            value: roiZSliderIndex,
            min: 0,
            max: zSliderMax,
            step: 1,
            disabled: controlsDisabled || roiZValues.length <= 1,
            onChange: (nextIndex) => setRoiZSliderIndex(clamp(Math.round(nextIndex), 0, zSliderMax)),
            onCommit: (nextIndex) => {
              const rounded = clamp(Math.round(nextIndex), 0, zSliderMax);
              setRoiZSliderIndex(rounded);
              const nextZ = roiZValues[rounded];
              if (nextZ != null) setRoiSelectionKey("z", nextZ);
            },
            previousDisabled: controlsDisabled || roiZValues.length <= 1 || roiZSliderIndex <= 0,
            nextDisabled: controlsDisabled || roiZValues.length <= 1 || roiZSliderIndex >= zSliderMax,
            onPrevious: () => {
              const nextIndex = Math.max(0, roiZSliderIndex - 1);
              setRoiZSliderIndex(nextIndex);
              const nextZ = roiZValues[nextIndex];
              if (nextZ != null) setRoiSelectionKey("z", nextZ);
            },
            onNext: () => {
              const nextIndex = Math.min(zSliderMax, roiZSliderIndex + 1);
              setRoiZSliderIndex(nextIndex);
              const nextZ = roiZValues[nextIndex];
              if (nextZ != null) setRoiSelectionKey("z", nextZ);
            },
          }}
        />
        <SelectStepperField
          label="ROI"
          value={selectedRoi ?? roiOptions[0]?.value ?? 0}
          options={roiOptions}
          disabled={controlsDisabled || roiOptions.length === 0}
          onChange={(value) => setSelectedRoi(value)}
          previousDisabled={controlsDisabled || roiOptions.length === 0 || selectedRoiIndex <= 0}
          nextDisabled={
            controlsDisabled || roiOptions.length === 0 || selectedRoiIndex >= roiOptions.length - 1
          }
          onPrevious={() => {
            const nextValue = roiOptions[selectedRoiIndex - 1]?.value;
            if (nextValue != null) setSelectedRoi(nextValue);
          }}
          onNext={() => {
            const nextValue = roiOptions[selectedRoiIndex + 1]?.value;
            if (nextValue != null) setSelectedRoi(nextValue);
          }}
        />
      </SidebarSection>
    );
  };

  const renderRawStack = () => {
    const controlsDisabled = !rawState.selection || !rawState.scan;
    const timeSliderMax = Math.max(0, rawTimeValues.length - 1);
    const zSliderMax = Math.max(0, rawZValues.length - 1);

    return (
      <SidebarSection title="Raw Stack">
        <NavigationControls
          position={{
            value: rawState.selection?.pos ?? (rawPositionOptions[0]?.value ?? 0),
            options: rawPositionOptions,
            disabled: controlsDisabled,
            onChange: (value) => setRawSelectionKey("pos", value),
            previousDisabled: controlsDisabled || selectedRawPositionIndex <= 0,
            nextDisabled: controlsDisabled || selectedRawPositionIndex >= rawPositionOptions.length - 1,
            onPrevious: () => {
              const nextValue = rawPositionOptions[selectedRawPositionIndex - 1]?.value;
              if (nextValue != null) setRawSelectionKey("pos", nextValue);
            },
            onNext: () => {
              const nextValue = rawPositionOptions[selectedRawPositionIndex + 1]?.value;
              if (nextValue != null) setRawSelectionKey("pos", nextValue);
            },
          }}
          channel={{
            value: rawState.selection?.channel ?? (rawChannelOptions[0]?.value ?? 0),
            options: rawChannelOptions,
            disabled: controlsDisabled,
            onChange: (value) => setRawSelectionKey("channel", value),
            previousDisabled: controlsDisabled || selectedRawChannelIndex <= 0,
            nextDisabled: controlsDisabled || selectedRawChannelIndex >= rawChannelOptions.length - 1,
            onPrevious: () => {
              const nextValue = rawChannelOptions[selectedRawChannelIndex - 1]?.value;
              if (nextValue != null) setRawSelectionKey("channel", nextValue);
            },
            onNext: () => {
              const nextValue = rawChannelOptions[selectedRawChannelIndex + 1]?.value;
              if (nextValue != null) setRawSelectionKey("channel", nextValue);
            },
          }}
          timepoint={{
            hint: String(rawTimeValues[rawTimeSliderIndex] ?? rawState.selection?.time ?? 0),
            value: rawTimeSliderIndex,
            min: 0,
            max: timeSliderMax,
            step: 1,
            disabled: controlsDisabled || rawTimeValues.length <= 1,
            onChange: (nextIndex) => setRawTimeSliderIndex(clamp(Math.round(nextIndex), 0, timeSliderMax)),
            onCommit: (nextIndex) => {
              const rounded = clamp(Math.round(nextIndex), 0, timeSliderMax);
              setRawTimeSliderIndex(rounded);
              const nextTime = rawTimeValues[rounded];
              if (nextTime != null) setRawSelectionKey("time", nextTime);
            },
            previousDisabled: controlsDisabled || rawTimeValues.length <= 1 || rawTimeSliderIndex <= 0,
            nextDisabled: controlsDisabled || rawTimeValues.length <= 1 || rawTimeSliderIndex >= timeSliderMax,
            onPrevious: () => {
              const nextIndex = Math.max(0, rawTimeSliderIndex - 1);
              setRawTimeSliderIndex(nextIndex);
              const nextTime = rawTimeValues[nextIndex];
              if (nextTime != null) setRawSelectionKey("time", nextTime);
            },
            onNext: () => {
              const nextIndex = Math.min(timeSliderMax, rawTimeSliderIndex + 1);
              setRawTimeSliderIndex(nextIndex);
              const nextTime = rawTimeValues[nextIndex];
              if (nextTime != null) setRawSelectionKey("time", nextTime);
            },
          }}
          zPlane={{
            hint: String(rawZValues[rawZSliderIndex] ?? rawState.selection?.z ?? 0),
            value: rawZSliderIndex,
            min: 0,
            max: zSliderMax,
            step: 1,
            disabled: controlsDisabled || rawZValues.length <= 1,
            onChange: (nextIndex) => setRawZSliderIndex(clamp(Math.round(nextIndex), 0, zSliderMax)),
            onCommit: (nextIndex) => {
              const rounded = clamp(Math.round(nextIndex), 0, zSliderMax);
              setRawZSliderIndex(rounded);
              const nextZ = rawZValues[rounded];
              if (nextZ != null) setRawSelectionKey("z", nextZ);
            },
            previousDisabled: controlsDisabled || rawZValues.length <= 1 || rawZSliderIndex <= 0,
            nextDisabled: controlsDisabled || rawZValues.length <= 1 || rawZSliderIndex >= zSliderMax,
            onPrevious: () => {
              const nextIndex = Math.max(0, rawZSliderIndex - 1);
              setRawZSliderIndex(nextIndex);
              const nextZ = rawZValues[nextIndex];
              if (nextZ != null) setRawSelectionKey("z", nextZ);
            },
            onNext: () => {
              const nextIndex = Math.min(zSliderMax, rawZSliderIndex + 1);
              setRawZSliderIndex(nextIndex);
              const nextZ = rawZValues[nextIndex];
              if (nextZ != null) setRawSelectionKey("z", nextZ);
            },
          }}
        />
      </SidebarSection>
    );
  };

  const renderCanvasContent = (emptyText: string | null, modeFallback: string) => {
    if (emptyText) {
      return (
        <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-border/60 bg-card/10 px-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      );
    }
    if (editorFrameLoading) {
      return (
        <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-border/60 bg-card/10 px-6 text-center text-sm text-muted-foreground">
          Loading frame…
        </div>
      );
    }
    if (editorFrameError) {
      return (
        <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-red-500/35 bg-red-500/10 px-6 text-center text-sm text-red-200">
          {editorFrameError}
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-border/60 bg-card/10 px-6 text-center text-sm text-muted-foreground">
        {modeFallback}
      </div>
    );
  };

  return (
    <ToastProvider>
      <AnchoredToastProvider>
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground">
          <AnnotatorNavbar
            workspacePath={workspacePath}
            source={rawState.source}
            dataMode={dataMode}
            annotationMode={annotationMode}
            onDataModeChange={setDataMode}
            onAnnotationModeChange={setAnnotationMode}
            onPickWorkspace={handlePickWorkspace}
            onOpenTif={() => handleOpenSource(hostPort.pickTifDirectory, "tif")}
            onOpenJpg={() => handleOpenSource(hostPort.pickJpgDirectory, "jpg")}
            onOpenNd2={() => handleOpenSource(hostPort.pickNd2File, "nd2")}
            onOpenCzi={() => handleOpenSource(hostPort.pickCziFile, "czi")}
            onClearSource={() => setRawSource(null)}
          />

          <main className="flex-1 min-h-0 overflow-hidden">
            <div className="grid h-full min-h-0 grid-cols-[18rem_minmax(0,1fr)_18rem] items-stretch">
              {dataMode === "roi" && canMountRoiUi && workspacePath && displayFrame && roiRequest && selectedRoiEntry ? (
                <RoiAnnotationSession
                  workspacePath={workspacePath}
                  backend={backend}
                  roi={selectedRoiEntry}
                  request={roiRequest}
                  frame={displayFrame}
                  annotationLoadEnabled={annotationFrameReady}
                  frameLoadError={editorFrameError}
                  labels={annotationLabels}
                  labelsLoading={annotationLabelsLoading}
                  labelsError={annotationLabelsError}
                  onClose={handleCloseSession}
                  onLabelsChange={() => undefined}
                  onSaved={(_annotation: RoiFrameAnnotation) => {}}
                >
                  <>
                    <aside className="col-start-1 h-full min-h-0 min-w-0 overflow-y-auto divide-y divide-border border-r border-border px-5 py-4">
                      {renderRoiStack()}
                      <AnnotatorOutputsSection
                        backend={backend}
                        workspacePath={workspacePath}
                        mode="roi"
                        roiRequest={roiRequest}
                        roiEntry={selectedRoiEntry}
                      />
                    </aside>
                    <section className="col-start-2 h-full min-h-0 min-w-0 overflow-hidden" role="region" aria-label={`ROI ${selectedRoiEntry.roi}`}>
                      <div className="m-4 flex h-[calc(100%-2rem)] min-h-0 flex-col overflow-hidden">
                        {editorFrameError ? (
                          renderCanvasContent(null, "")
                        ) : !annotationFrameReady ? (
                          renderCanvasContent(null, "")
                        ) : (
                          <RoiAnnotationCanvasPanel className="rounded-[1.75rem] border border-border/80 bg-card shadow-2xl" />
                        )}
                      </div>
                    </section>
                    <RoiAnnotationToolbar className="col-start-3" />
                  </>
                </RoiAnnotationSession>
              ) : dataMode === "raw" && canMountRawUi && workspacePath && displayFrame && rawRequest && rawState.source ? (
                <RawAnnotationSession
                  workspacePath={workspacePath}
                  source={rawState.source}
                  backend={backend}
                  request={rawRequest}
                  frame={displayFrame}
                  annotationLoadEnabled={annotationFrameReady}
                  frameLoadError={editorFrameError}
                  labels={annotationLabels}
                  labelsLoading={annotationLabelsLoading}
                  labelsError={annotationLabelsError}
                  onClose={handleCloseSession}
                  onLabelsChange={() => undefined}
                  onSaved={(_annotation: RawFrameAnnotation) => {}}
                >
                  <>
                    <aside className="col-start-1 h-full min-h-0 min-w-0 overflow-y-auto divide-y divide-border border-r border-border px-5 py-4">
                      {renderRawStack()}
                      <AnnotatorOutputsSection
                        backend={backend}
                        workspacePath={workspacePath}
                        mode="raw"
                        rawRequest={rawRequest}
                        source={rawState.source}
                      />
                    </aside>
                    <section className="col-start-2 h-full min-h-0 min-w-0 overflow-hidden" role="region" aria-label="Raw frame annotation">
                      <div className="m-4 flex h-[calc(100%-2rem)] min-h-0 flex-col overflow-hidden">
                        {editorFrameError ? (
                          renderCanvasContent(null, "")
                        ) : !annotationFrameReady ? (
                          renderCanvasContent(null, "")
                        ) : (
                          <RoiAnnotationCanvasPanel className="rounded-[1.75rem] border border-border/80 bg-card shadow-2xl" />
                        )}
                      </div>
                    </section>
                    <RoiAnnotationToolbar className="col-start-3" />
                  </>
                </RawAnnotationSession>
              ) : (
                <RoiAnnotationProvider
                  frame={SHELL_ANNOTATION_FRAME}
                  labels={annotationLabels}
                  initialValue={{ classificationLabelId: null, mask: shellInitialMask }}
                  resetKey={`annotator-shell:${dataMode}`}
                  title={dataMode === "roi" ? "ROI Annotation" : "Raw Annotation"}
                  subtitle={annotationRailFallbackSubtitle}
                  loading={shellProviderLoading}
                  error={annotationLabelsError}
                  annotationInteractive={false}
                  onClose={handleCloseSession}
                  onSave={async () => {}}
                  onLabelsChange={
                    workspacePath
                      ? async (labels) => {
                          const saved = await saveAnnotationLabelsMutation.mutateAsync({
                            workspacePath,
                            labels,
                          });
                          return saved;
                        }
                      : undefined
                  }
                >
                  <aside className="col-start-1 h-full min-h-0 min-w-0 overflow-y-auto divide-y divide-border border-r border-border px-5 py-4">
                    {dataMode === "roi" ? renderRoiStack() : renderRawStack()}
                    <AnnotatorOutputsSection
                      backend={backend}
                      workspacePath={workspacePath}
                      mode={dataMode}
                      roiRequest={roiRequest}
                      roiEntry={selectedRoiEntry}
                      rawRequest={rawRequest}
                      source={rawState.source}
                    />
                  </aside>
                  <section className="col-start-2 h-full min-h-0 min-w-0 overflow-hidden">
                    <div className="m-4 flex h-[calc(100%-2rem)] min-h-0 flex-col overflow-hidden">
                      {dataMode === "roi"
                        ? renderCanvasContent(
                            roiEmptyText,
                            "Select a ROI and stack position to load a frame.",
                          )
                        : renderCanvasContent(
                            rawEmptyText,
                            "Select a raw frame to load.",
                          )}
                    </div>
                  </section>
                  <RoiAnnotationToolbar className="col-start-3" />
                  <AnnotationLabelManagerDialog />
                  <RoiAnnotationDiscardDialog />
                </RoiAnnotationProvider>
              )}
            </div>
          </main>
        </div>
      </AnchoredToastProvider>
    </ToastProvider>
  );
}

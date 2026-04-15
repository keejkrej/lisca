import { Effect, Exit } from "effect";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "sonner";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type {
  AnnotationLabel,
  FrameResult,
  RoiFrameAnnotation,
  RoiFrameRequest,
  RoiPositionScan,
  ViewerDataPort,
  ViewerHostPort,
} from "lisca/viewer/contracts";
import { clamp } from "lisca/viewer/core";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "lisca/viewer/ui";

import RoiAnnotationSession from "../annotator/RoiAnnotationSession";
import {
  findNavigationOptionIndex,
  NavigationControls,
  toNavigationOptions,
} from "./NavigationControls";
import {
  patchRoiState,
  resetRoiState,
  roiStore,
  setRoiSelectionKey,
  setSelectedRoi,
  setRoiScan,
} from "./roiStore";
import {
  loadAnnotationLabelsEffect,
  loadRoiFrameEffect,
  scanRoiWorkspaceEffect,
  toErrorMessage,
} from "./viewerEffects";
import { setWorkspacePath, viewerStore } from "./viewerStore";
import { showErrorToast } from "./toast";
import { SidebarField, SidebarSection, SidebarValue } from "./sidebar";

type SelectValue = number | string;

type Option<T extends SelectValue> = {
  label: string;
  value: T;
};

function AppSelect<T extends SelectValue>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <Select<T>
      value={value}
      onValueChange={(next: T | null) => next != null && onChange(next)}
      items={options}
      disabled={disabled}
      modal={false}
    >
      <SelectTrigger size="sm" className="text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function currentPositionScan(scan: { positions: RoiPositionScan[] } | null, pos: number | null) {
  if (!scan || pos == null) return null;
  return scan.positions.find((entry) => entry.pos === pos) ?? null;
}

interface AnnotatorAppProps {
  dataPort: ViewerDataPort;
  hostPort: ViewerHostPort;
}

export default function AnnotatorApp({ dataPort: backend, hostPort }: AnnotatorAppProps) {
  const workspacePath = useStore(viewerStore, (state) => state.workspacePath);

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

  const [annotationLabelsState, setAnnotationLabelsState] = useState<{
    labels: AnnotationLabel[] | null;
    loading: boolean;
    error: string | null;
  }>({
    labels: null,
    loading: false,
    error: null,
  });

  const [editorFrame, setEditorFrame] = useState<FrameResult | null>(null);
  const [editorFrameLoading, setEditorFrameLoading] = useState(false);
  const [editorFrameError, setEditorFrameError] = useState<string | null>(null);

  const lastWorkspaceErrorToastRef = useRef<string | null>(null);
  const lastLabelsErrorToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      lastWorkspaceErrorToastRef.current = null;
      return;
    }
    if (lastWorkspaceErrorToastRef.current === error) return;
    lastWorkspaceErrorToastRef.current = error;
    showErrorToast(error);
  }, [error]);

  useEffect(() => {
    if (!annotationLabelsState.error) {
      lastLabelsErrorToastRef.current = null;
      return;
    }
    if (lastLabelsErrorToastRef.current === annotationLabelsState.error) return;
    lastLabelsErrorToastRef.current = annotationLabelsState.error;
    showErrorToast(annotationLabelsState.error);
  }, [annotationLabelsState.error]);

  useEffect(() => {
    if (!workspacePath) {
      resetRoiState();
      setAnnotationLabelsState({
        labels: null,
        loading: false,
        error: null,
      });
      setEditorFrame(null);
      setEditorFrameLoading(false);
      setEditorFrameError(null);
      return;
    }

    const abortController = new AbortController();
    patchRoiState({
      loading: true,
      error: null,
    });

    const program = scanRoiWorkspaceEffect(backend, workspacePath).pipe(
      Effect.tap(({ scan: nextScan }) =>
        Effect.sync(() => {
          setRoiScan(nextScan);
        }),
      ),
      Effect.catchAll((scanError) =>
        Effect.sync(() => {
          patchRoiState({
            scan: null,
            selection: null,
            pageIndex: 0,
            selectedRoi: null,
            error: toErrorMessage(scanError),
          });
        }),
      ),
      Effect.ensuring(
        Effect.sync(() => {
          patchRoiState({ loading: false });
        }),
      ),
    );

    void Effect.runPromiseExit(program, {
      signal: abortController.signal,
    }).then((exit) => {
      if (!Exit.isFailure(exit)) return;
      if (abortController.signal.aborted) return;
      patchRoiState({
        scan: null,
        selection: null,
        pageIndex: 0,
        selectedRoi: null,
        loading: false,
        error: toErrorMessage(exit.cause),
      });
    });

    return () => {
      abortController.abort();
    };
  }, [backend, workspacePath]);

  useEffect(() => {
    if (!workspacePath) return;

    const abortController = new AbortController();
    setAnnotationLabelsState({
      labels: null,
      loading: true,
      error: null,
    });

    const program = loadAnnotationLabelsEffect(backend, workspacePath);
    void Effect.runPromiseExit(program, {
      signal: abortController.signal,
    }).then((exit) => {
      if (abortController.signal.aborted) return;
      if (Exit.isSuccess(exit)) {
        setAnnotationLabelsState({
          labels: exit.value.labels,
          loading: false,
          error: null,
        });
        return;
      }

      setAnnotationLabelsState({
        labels: null,
        loading: false,
        error: toErrorMessage(exit.cause),
      });
    });

    return () => {
      abortController.abort();
    };
  }, [backend, workspacePath]);

  const position = useMemo(
    () => currentPositionScan(scan, selection?.pos ?? null),
    [scan, selection?.pos],
  );
  const roiEntries = position?.rois ?? [];

  const selectedRoiEntry = useMemo(
    () => roiEntries.find((roi) => roi.roi === selectedRoi) ?? null,
    [roiEntries, selectedRoi],
  );

  const positionOptions = useMemo(
    () => toNavigationOptions(scan?.positions.map((entry) => entry.pos) ?? []),
    [scan],
  );
  const channelOptions = useMemo(() => toNavigationOptions(position?.channels ?? []), [position]);
  const zValues = position?.zSlices ?? [];
  const selectedPosition = selection?.pos ?? positionOptions[0]?.value ?? null;
  const selectedChannel = selection?.channel ?? channelOptions[0]?.value ?? null;
  const selectedPositionIndex = findNavigationOptionIndex(positionOptions, selectedPosition);
  const selectedChannelIndex = findNavigationOptionIndex(channelOptions, selectedChannel);
  const selectedZIndex = useMemo(() => {
    if (!selection) return 0;
    const index = zValues.indexOf(selection.z);
    return index >= 0 ? index : 0;
  }, [selection, zValues]);
  const timeValues = position?.times ?? [];
  const selectedTimeIndex = useMemo(() => {
    if (!selection) return 0;
    const index = timeValues.indexOf(selection.time);
    return index >= 0 ? index : 0;
  }, [selection, timeValues]);
  const [timeSliderIndex, setTimeSliderIndexValue] = useState(0);
  const [zSliderIndex, setZSliderIndexValue] = useState(0);
  const timeSliderMax = Math.max(0, timeValues.length - 1);
  const zSliderMax = Math.max(0, zValues.length - 1);
  const displayedTime = timeValues[timeSliderIndex] ?? selection?.time ?? 0;
  const displayedZ = zValues[zSliderIndex] ?? selection?.z ?? 0;
  const controlsDisabled = !selection || !position || roiEntries.length === 0;
  const hasRoiPositions = Boolean(scan && scan.positions.length > 0);

  const roiOptions = useMemo(
    () =>
      roiEntries.map((roi) => ({
        label: `ROI ${roi.roi}`,
        value: roi.roi,
      })),
    [roiEntries],
  );

  const selectedAnnotationRequest = useMemo((): RoiFrameRequest | null => {
    if (!selection || !selectedRoiEntry) return null;
    return {
      pos: selection.pos,
      roi: selectedRoiEntry.roi,
      channel: selection.channel,
      time: selection.time,
      z: selection.z,
    };
  }, [selectedRoiEntry, selection]);

  const requestLoadKey = useMemo(() => {
    if (!selectedAnnotationRequest) return null;
    const r = selectedAnnotationRequest;
    return [r.pos, r.roi, r.channel, r.time, r.z].join(":");
  }, [selectedAnnotationRequest]);

  useEffect(() => {
    setTimeSliderIndexValue(selectedTimeIndex);
  }, [selectedTimeIndex]);

  useEffect(() => {
    setZSliderIndexValue(selectedZIndex);
  }, [selectedZIndex]);

  useEffect(() => {
    if (roiEntries.length === 0) {
      if (selectedRoi != null) setSelectedRoi(null);
      return;
    }

    if (selectedRoi == null || !roiEntries.some((roi) => roi.roi === selectedRoi)) {
      setSelectedRoi(roiEntries[0]?.roi ?? null);
    }
  }, [roiEntries, selectedRoi]);

  useEffect(() => {
    if (!workspacePath || !requestLoadKey || !selectedAnnotationRequest) {
      setEditorFrame(null);
      setEditorFrameLoading(false);
      setEditorFrameError(null);
      return;
    }

    const abortController = new AbortController();
    setEditorFrameLoading(true);
    setEditorFrameError(null);

    const program = loadRoiFrameEffect(backend, workspacePath, selectedAnnotationRequest, {
      mode: "auto",
      min: 0,
      max: 65535,
    });

    void Effect.runPromiseExit(program, {
      signal: abortController.signal,
    }).then((exit) => {
      if (abortController.signal.aborted) return;
      if (Exit.isSuccess(exit)) {
        setEditorFrame(exit.value.frame);
        setEditorFrameLoading(false);
        setEditorFrameError(null);
        return;
      }
      setEditorFrame(null);
      setEditorFrameError(toErrorMessage(exit.cause));
      setEditorFrameLoading(false);
    });

    return () => {
      abortController.abort();
    };
  }, [backend, requestLoadKey, selectedAnnotationRequest, workspacePath]);

  const handlePickWorkspace = async () => {
    const selected = await hostPort.pickWorkspace();
    if (selected) setWorkspacePath(selected);
  };

  const handleCloseSession = () => {
    resetRoiState();
    setWorkspacePath(null);
  };

  const emptyText = useMemo(() => {
    if (loading) return "Scanning workspace ROI output...";
    if (error) return error;
    return null;
  }, [error, loading]);

  const showEditor =
    workspacePath &&
    selectedRoiEntry &&
    selectedAnnotationRequest &&
    editorFrame &&
    !editorFrameLoading &&
    !editorFrameError;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <Toaster position="bottom-right" theme="dark" richColors closeButton />

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="space-y-1">
          <h1 className="text-sm font-semibold text-foreground">Annotator</h1>
          <p className="text-xs text-muted-foreground">ROI TIFF stacks in the workspace output layout</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {workspacePath ? (
            <SidebarValue monospace className="max-w-[min(48rem,50vw)] truncate text-xs">
              {workspacePath}
            </SidebarValue>
          ) : (
            <span className="text-xs text-muted-foreground">No workspace open</span>
          )}
          <Button size="sm" variant="outline" onClick={() => void handlePickWorkspace()}>
            Open workspace
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="h-full min-h-0 w-[18rem] shrink-0 overflow-y-auto divide-y divide-border border-r border-border px-5 py-4">
          <SidebarSection title="ROI Stack">
            <NavigationControls
              position={{
                value: selection?.pos ?? (positionOptions[0]?.value ?? 0),
                options: positionOptions,
                disabled: !hasRoiPositions || !selection,
                onChange: (value) => setRoiSelectionKey("pos", value),
                previousDisabled: !hasRoiPositions || !selection || selectedPositionIndex <= 0,
                nextDisabled:
                  !hasRoiPositions || !selection || selectedPositionIndex >= positionOptions.length - 1,
                onPrevious: () => {
                  const nextValue = positionOptions[selectedPositionIndex - 1]?.value;
                  if (nextValue != null && nextValue !== selection?.pos) {
                    setRoiSelectionKey("pos", nextValue);
                  }
                },
                onNext: () => {
                  const nextValue = positionOptions[selectedPositionIndex + 1]?.value;
                  if (nextValue != null && nextValue !== selection?.pos) {
                    setRoiSelectionKey("pos", nextValue);
                  }
                },
              }}
              channel={{
                value: selection?.channel ?? (channelOptions[0]?.value ?? 0),
                options: channelOptions,
                disabled: controlsDisabled,
                onChange: (value) => setRoiSelectionKey("channel", value),
                previousDisabled: controlsDisabled || selectedChannelIndex <= 0,
                nextDisabled: controlsDisabled || selectedChannelIndex >= channelOptions.length - 1,
                onPrevious: () => {
                  const nextValue = channelOptions[selectedChannelIndex - 1]?.value;
                  if (nextValue != null && nextValue !== selection?.channel) {
                    setRoiSelectionKey("channel", nextValue);
                  }
                },
                onNext: () => {
                  const nextValue = channelOptions[selectedChannelIndex + 1]?.value;
                  if (nextValue != null && nextValue !== selection?.channel) {
                    setRoiSelectionKey("channel", nextValue);
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
                  setTimeSliderIndexValue(clamp(Math.round(nextIndex), 0, timeSliderMax)),
                onCommit: (nextIndex) => {
                  const rounded = clamp(Math.round(nextIndex), 0, timeSliderMax);
                  setTimeSliderIndexValue(rounded);
                  const nextTime = timeValues[rounded];
                  if (nextTime != null && nextTime !== selection?.time) {
                    setRoiSelectionKey("time", nextTime);
                  }
                },
                previousDisabled: controlsDisabled || timeValues.length <= 1 || timeSliderIndex <= 0,
                nextDisabled:
                  controlsDisabled || timeValues.length <= 1 || timeSliderIndex >= timeSliderMax,
                onPrevious: () => {
                  const nextIndex = Math.max(0, timeSliderIndex - 1);
                  setTimeSliderIndexValue(nextIndex);
                  const nextTime = timeValues[nextIndex];
                  if (nextTime != null && nextTime !== selection?.time) {
                    setRoiSelectionKey("time", nextTime);
                  }
                },
                onNext: () => {
                  const nextIndex = Math.min(timeSliderMax, timeSliderIndex + 1);
                  setTimeSliderIndexValue(nextIndex);
                  const nextTime = timeValues[nextIndex];
                  if (nextTime != null && nextTime !== selection?.time) {
                    setRoiSelectionKey("time", nextTime);
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
                onChange: (nextIndex) =>
                  setZSliderIndexValue(clamp(Math.round(nextIndex), 0, zSliderMax)),
                onCommit: (nextIndex) => {
                  const rounded = clamp(Math.round(nextIndex), 0, zSliderMax);
                  setZSliderIndexValue(rounded);
                  const nextZ = zValues[rounded];
                  if (nextZ != null && nextZ !== selection?.z) {
                    setRoiSelectionKey("z", nextZ);
                  }
                },
                previousDisabled: controlsDisabled || zValues.length <= 1 || zSliderIndex <= 0,
                nextDisabled: controlsDisabled || zValues.length <= 1 || zSliderIndex >= zSliderMax,
                onPrevious: () => {
                  const nextIndex = Math.max(0, zSliderIndex - 1);
                  setZSliderIndexValue(nextIndex);
                  const nextZ = zValues[nextIndex];
                  if (nextZ != null && nextZ !== selection?.z) {
                    setRoiSelectionKey("z", nextZ);
                  }
                },
                onNext: () => {
                  const nextIndex = Math.min(zSliderMax, zSliderIndex + 1);
                  setZSliderIndexValue(nextIndex);
                  const nextZ = zValues[nextIndex];
                  if (nextZ != null && nextZ !== selection?.z) {
                    setRoiSelectionKey("z", nextZ);
                  }
                },
              }}
            />
            <SidebarField label="ROI">
              <AppSelect
                value={selectedRoi ?? (roiOptions[0]?.value ?? 0)}
                options={roiOptions}
                disabled={controlsDisabled || roiOptions.length === 0}
                onChange={(value) => setSelectedRoi(value)}
              />
            </SidebarField>
          </SidebarSection>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4">
          {!workspacePath ? (
            <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-border/60 bg-card/10 px-6 text-center text-sm text-muted-foreground">
              Open a workspace folder that contains ROI TIFF output (roi/Pos folders and index.json).
            </div>
          ) : emptyText ? (
            <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-border/60 bg-card/10 px-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : editorFrameLoading ? (
            <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-border/60 bg-card/10 px-6 text-center text-sm text-muted-foreground">
              Loading frame…
            </div>
          ) : editorFrameError ? (
            <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-red-500/35 bg-red-500/10 px-6 text-center text-sm text-red-200">
              {editorFrameError}
            </div>
          ) : showEditor && selectedRoiEntry && selectedAnnotationRequest && editorFrame ? (
            <RoiAnnotationSession
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-2xl"
              workspacePath={workspacePath}
              backend={backend}
              roi={selectedRoiEntry}
              request={selectedAnnotationRequest}
              frame={editorFrame}
              labels={annotationLabelsState.labels}
              labelsLoading={annotationLabelsState.loading}
              labelsError={annotationLabelsState.error}
              onClose={handleCloseSession}
              onLabelsChange={(labels) =>
                setAnnotationLabelsState({
                  labels,
                  loading: false,
                  error: null,
                })
              }
              onSaved={(_annotation: RoiFrameAnnotation) => {
                /* session resets via load effect when request unchanged; no-op */
              }}
            />
          ) : (
            <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-border/60 bg-card/10 px-6 text-center text-sm text-muted-foreground">
              Select a ROI and stack position to load a frame.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

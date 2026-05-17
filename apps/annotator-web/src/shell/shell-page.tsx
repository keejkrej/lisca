import type {
  AnnotationLabel,
  AnnotationMode,
  ContrastWindow,
  FrameResult,
  RoiFrameRequest,
  RoiIndexEntry,
  RoiPositionScan,
  RoiWorkspaceScan,
} from "@lisca/contracts";
import {
  AppShell,
  Button,
  ContrastControl,
  FrameNavigation,
  HostFilePickerDialog,
  Input,
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
  Section,
  ShellNavbar,
  Slider,
  ToggleGroup,
  ToggleGroupItem,
  buttonVariants,
  cn,
  findNavigationOptionIndex,
  stepNavigationValue,
  toNavigationOptions,
  useShellWorkspace,
} from "@lisca/ui";
import { useNavigate } from "@tanstack/react-router";
import { Effect, Exit } from "effect";
import { ChevronDown, Plus, Tags, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AnnotationCanvas, type AnnotationTool } from "../annotation-canvas";
import {
  effectErrorMessage,
  loadRoiFrameAnnotationEffect,
  loadRoiFrameEffect,
} from "../annotator-effects";
import {
  annotatorApi,
  toAnnotatorErrorMessage,
  useAnnotationLabelsQuery,
  useRoiWorkspaceScanQuery,
  useSaveAnnotationLabelsMutation,
  useSaveRoiFrameAnnotationMutation,
} from "../annotator-queries";
import {
  currentPosition,
  currentRoi,
  requestKey,
  roiRequestSelectionKey,
  useAnnotatorStore,
} from "../annotator-store";
import {
  annotationValuesEqual,
  cloneAnnotationValue,
  createEmptyMask,
  encodeMaskToBase64Png,
  labelColorStyle,
  maskHasPixels,
  type AnnotationValue,
} from "../annotation-utils";

type AnnotationHistory = {
  history: AnnotationValue[];
  index: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeRequest(
  position: RoiPositionScan | null,
  roi: RoiIndexEntry | null,
  channel: number | null,
  timeIndex: number,
  zIndex: number,
): RoiFrameRequest | null {
  if (!position || !roi || channel == null) return null;
  const time = position.times[timeIndex];
  const z = position.zSlices[zIndex];
  if (time == null || z == null) return null;
  return {
    pos: position.pos,
    roi: roi.roi,
    channel,
    time,
    z,
  };
}

function emptyValueFor(frame: FrameResult | null): AnnotationValue {
  return {
    classificationLabelId: null,
    mask: frame ? createEmptyMask(frame.width, frame.height) : new Uint8Array(),
  };
}

function useAnnotationHistory(frame: FrameResult | null) {
  const [initialValue, setInitialValue] = useState<AnnotationValue>(() => emptyValueFor(null));
  const [state, setState] = useState<AnnotationHistory>(() => ({
    history: [emptyValueFor(null)],
    index: 0,
  }));

  const current = state.history[state.index] ?? initialValue;
  const dirty = !annotationValuesEqual(current, initialValue);

  const reset = useCallback((value: AnnotationValue) => {
    const next = cloneAnnotationValue(value);
    setInitialValue(next);
    setState({ history: [cloneAnnotationValue(next)], index: 0 });
  }, []);

  const commit = useCallback((value: AnnotationValue) => {
    setState((currentState) => {
      const active = currentState.history[currentState.index];
      if (active && annotationValuesEqual(active, value)) return currentState;
      const history = currentState.history
        .slice(0, currentState.index + 1)
        .map(cloneAnnotationValue);
      history.push(cloneAnnotationValue(value));
      return { history, index: history.length - 1 };
    });
  }, []);

  useEffect(() => {
    if (!frame) reset(emptyValueFor(null));
  }, [frame, reset]);

  return {
    current,
    dirty,
    canUndo: state.index > 0,
    canRedo: state.index < state.history.length - 1,
    reset,
    commit,
    undo: () => setState((value) => ({ ...value, index: Math.max(0, value.index - 1) })),
    redo: () =>
      setState((value) => ({
        ...value,
        index: Math.min(value.history.length - 1, value.index + 1),
      })),
    discard: () => reset(initialValue),
    markSaved: () => reset(current),
  };
}

function AnnotationModeToggle({
  mode,
  onModeChange,
  className,
}: {
  mode: AnnotationMode;
  onModeChange: (mode: AnnotationMode) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      className={cn("w-full min-w-0", className)}
      multiple={false}
      size="sm"
      value={[mode]}
      variant="outline"
      onValueChange={(next) => {
        const value = next[0];
        if (value === "classification" || value === "segmentation") onModeChange(value);
      }}
    >
      <ToggleGroupItem value="classification" className="min-w-0 flex-1 px-2 text-xs">
        Classification
      </ToggleGroupItem>
      <ToggleGroupItem value="segmentation" className="min-w-0 flex-1 px-2 text-xs">
        Segmentation
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

type LabelDraft = {
  id: string;
  name: string;
  color: string;
};

const defaultLabelDrafts: LabelDraft[] = [
  { id: "class-1", name: "Class 1", color: "#22c55e" },
  { id: "class-2", name: "Class 2", color: "#3b82f6" },
  { id: "class-3", name: "Class 3", color: "#f59e0b" },
];

function normalizeLabelId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function labelDraftsFrom(labels: AnnotationLabel[]) {
  return labels.length > 0 ? labels.map((label) => ({ ...label })) : defaultLabelDrafts;
}

function AnnotatorToolsMenu(props: { workspacePath: string | null; onCreateLabels: () => void }) {
  return (
    <Menu>
      <MenuTrigger
        className={cn(
          buttonVariants({
            size: "sm",
            variant: "outline",
            className:
              "group inline-flex w-fit shrink-0 justify-between gap-2 font-normal text-foreground shadow-none hover:bg-muted/40 data-popup-open:bg-muted/60",
          }),
        )}
      >
        Tools
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[popup-open]:rotate-180" />
      </MenuTrigger>
      <MenuPopup
        align="end"
        className="w-60 rounded-2xl border-border p-2 shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
        side="bottom"
        sideOffset={8}
      >
        <MenuItem
          disabled={!props.workspacePath}
          className="h-auto min-h-0 items-start gap-2 py-2.5 text-left"
          onClick={props.onCreateLabels}
        >
          <Tags className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block font-medium text-foreground text-sm">Create labels</span>
            <span className="block text-muted-foreground text-xs">
              Write annotations/labels.json
            </span>
          </span>
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

function LabelCreationDialog(props: {
  open: boolean;
  workspacePath: string | null;
  labels: AnnotationLabel[];
  saving: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (labels: AnnotationLabel[]) => void;
}) {
  const [drafts, setDrafts] = useState<LabelDraft[]>(() => labelDraftsFrom(props.labels));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (props.open) {
      setDrafts(labelDraftsFrom(props.labels));
      setLocalError(null);
    }
  }, [props.labels, props.open]);

  useEffect(() => {
    if (!props.open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props]);

  if (!props.open) return null;

  const updateDraft = (index: number, patch: Partial<LabelDraft>) => {
    setDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)),
    );
  };

  const addDraft = () => {
    setDrafts((current) => [
      ...current,
      {
        id: `class-${current.length + 1}`,
        name: `Class ${current.length + 1}`,
        color: "#a855f7",
      },
    ]);
  };

  const removeDraft = (index: number) => {
    setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
  };

  const submit = () => {
    const labels = drafts.map((draft) => ({
      id: normalizeLabelId(draft.id || draft.name),
      name: draft.name.trim(),
      color: draft.color.trim(),
    }));
    if (labels.length === 0) {
      setLocalError("Add at least one label.");
      return;
    }
    if (labels.some((label) => !label.id || !label.name || !label.color)) {
      setLocalError("Each label needs an id, name, and color.");
      return;
    }
    if (new Set(labels.map((label) => label.id)).size !== labels.length) {
      setLocalError("Label ids must be unique.");
      return;
    }
    props.onSave(labels);
  };

  const activeError = localError ?? props.error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onOpenChange(false);
      }}
    >
      <div
        aria-labelledby="label-dialog-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground text-lg" id="label-dialog-title">
              Create labels
            </h2>
            <p className="truncate text-muted-foreground text-sm" title={props.workspacePath ?? ""}>
              {props.workspacePath ?? "Select a workspace first"}
            </p>
          </div>
          <Button
            aria-label="Close label dialog"
            className="shrink-0"
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => props.onOpenChange(false)}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-4">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem_2rem] gap-2 px-1 text-muted-foreground text-xs">
            <span>Name</span>
            <span>ID</span>
            <span>Color</span>
            <span />
          </div>
          {drafts.map((draft, index) => (
            <div
              key={`${index}:${draft.id}`}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem_2rem] items-center gap-2"
            >
              <Input
                aria-label={`Label ${index + 1} name`}
                value={draft.name}
                onChange={(event) => {
                  const name = event.target.value;
                  updateDraft(index, { name, id: normalizeLabelId(name) || draft.id });
                }}
              />
              <Input
                aria-label={`Label ${index + 1} id`}
                value={draft.id}
                onChange={(event) => updateDraft(index, { id: event.target.value })}
              />
              <Input
                aria-label={`Label ${index + 1} color`}
                nativeInput
                type="color"
                value={draft.color}
                onChange={(event) => updateDraft(index, { color: event.target.value })}
              />
              <Button
                aria-label={`Remove ${draft.name || `label ${index + 1}`}`}
                disabled={drafts.length <= 1}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => removeDraft(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button className="w-fit" size="sm" type="button" variant="outline" onClick={addDraft}>
            <Plus className="size-4" aria-hidden />
            Add label
          </Button>
          {activeError ? <p className="text-destructive text-sm">{activeError}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!props.workspacePath}
            loading={props.saving}
            type="button"
            onClick={submit}
          >
            Save labels
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AnnotatorShellPage(props: { routeId: string }) {
  const navigate = useNavigate();
  const workspace = useShellWorkspace();
  const shellWorkspacePath = workspace.workspacePath;
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const {
    workspacePath,
    scan,
    labels,
    selection,
    activeLabelId,
    mode,
    tool,
    brushSize,
    overlayOpacity,
    frame,
    contrast,
    contrastDomain,
    contrastMin,
    contrastMax,
    scanLoading,
    frameLoading,
    annotationLoading,
    saving,
    scanError,
    frameError,
    annotationError,
    saveError,
    labelError,
    status,
    labelDialogOpen,
    setWorkspacePath,
    setScan,
    setLabels,
    setSelection,
    setActiveLabelId,
    setMode,
    setTool,
    setBrushSize,
    setOverlayOpacity,
    setFrame,
    setContrast,
    setContrastState,
    setScanLoading,
    setFrameLoading,
    setAnnotationLoading,
    setSaving,
    setScanError,
    setFrameError,
    setAnnotationError,
    setSaveError,
    setLabelError,
    setStatus,
    setLabelDialogOpen,
  } = useAnnotatorStore();
  const annotation = useAnnotationHistory(frame);
  const resetAnnotation = annotation.reset;
  const selectionChangingRef = useRef(false);
  const frameLoadIdRef = useRef(0);
  const annotationLoadIdRef = useRef(0);
  const scanQuery = useRoiWorkspaceScanQuery(shellWorkspacePath);
  const labelsQuery = useAnnotationLabelsQuery(shellWorkspacePath);
  const saveLabelsMutation = useSaveAnnotationLabelsMutation(shellWorkspacePath);
  const saveAnnotationMutation = useSaveRoiFrameAnnotationMutation(shellWorkspacePath);

  const position = useMemo(() => currentPosition(scan, selection.pos), [scan, selection.pos]);
  const selectedRoi = useMemo(() => currentRoi(position, selection.roi), [position, selection.roi]);
  const request = useMemo(
    () =>
      makeRequest(position, selectedRoi, selection.channel, selection.timeIndex, selection.zIndex),
    [position, selectedRoi, selection.channel, selection.timeIndex, selection.zIndex],
  );
  const activeSelectionKey = roiRequestSelectionKey(selection);
  const activeRequestKey = requestKey(position, selectedRoi, selection);
  const activeLabelValue = labels.findIndex((label) => label.id === activeLabelId) + 1;
  const canEdit =
    Boolean(frame && request && labels.length > 0) &&
    !frameLoading &&
    !annotationLoading &&
    !scanLoading;
  const toolCanRunWithoutLabel = tool === "brush-erase" || tool === "lasso-erase";
  const canEditSegmentation =
    canEdit && mode === "segmentation" && (activeLabelValue > 0 || toolCanRunWithoutLabel);
  const canSave = canEdit && annotation.dirty && !saving;
  const activeError = scanError ?? frameError ?? annotationError ?? saveError;
  const [visibleStatus, setVisibleStatus] = useState<string | null>(status);

  const guardDirty = useCallback(() => {
    if (!annotation.dirty || selectionChangingRef.current) return true;
    return window.confirm("Discard unsaved annotation changes?");
  }, [annotation.dirty]);

  const changeSelection = useCallback(
    (fn: () => void) => {
      if (!guardDirty()) return;
      selectionChangingRef.current = true;
      fn();
      window.setTimeout(() => {
        selectionChangingRef.current = false;
      }, 0);
    },
    [guardDirty],
  );

  useEffect(() => {
    if (workspace.workspacePath === workspacePath) return;
    if (workspace.workspacePath == null && workspacePath != null) {
      workspace.setWorkspacePath(workspacePath);
      return;
    }
    setWorkspacePath(workspace.workspacePath);
  }, [setWorkspacePath, workspace, workspacePath]);

  useEffect(() => {
    if (!status) {
      setVisibleStatus(null);
      return;
    }
    setVisibleStatus(status);
    if (
      status === "Scanning ROI workspace" ||
      status === "Loading ROI frame" ||
      status === "Loading ROI annotation"
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleStatus((current) => (current === status ? null : current));
    }, 2500);
    return () => window.clearTimeout(timeoutId);
  }, [status]);

  const activeStatus = frameLoading
    ? "Loading ROI frame"
    : annotationLoading
      ? "Loading ROI annotation"
      : scanLoading
        ? "Scanning ROI workspace"
        : visibleStatus;
  const canvasMessages = useMemo(() => {
    if (activeError) return [{ text: activeError, tone: "error" as const }];
    if (activeStatus) return [{ text: activeStatus }];
    return [];
  }, [activeError, activeStatus]);

  useEffect(() => {
    setScanLoading(Boolean(shellWorkspacePath && (scanQuery.isFetching || labelsQuery.isFetching)));
    if (scanQuery.isFetching || labelsQuery.isFetching) {
      setScanError(null);
      setStatus("Scanning ROI workspace");
    }
  }, [
    labelsQuery.isFetching,
    scanQuery.isFetching,
    setScanError,
    setScanLoading,
    setStatus,
    shellWorkspacePath,
  ]);

  useEffect(() => {
    if (workspacePath !== shellWorkspacePath) return;
    if (scanQuery.data) {
      setScan(scanQuery.data);
      setStatus("ROI workspace loaded");
    }
  }, [scanQuery.data, setScan, setStatus, shellWorkspacePath, workspacePath]);

  useEffect(() => {
    if (workspacePath !== shellWorkspacePath) return;
    if (labelsQuery.data) setLabels(labelsQuery.data);
  }, [labelsQuery.data, setLabels, shellWorkspacePath, workspacePath]);

  useEffect(() => {
    if (workspacePath !== shellWorkspacePath) return;
    const error = scanQuery.error ?? labelsQuery.error;
    if (!error) return;
    setFrame(null);
    setScanError(toAnnotatorErrorMessage(error, "ROI workspace load failed"));
  }, [
    labelsQuery.error,
    scanQuery.error,
    setFrame,
    setScanError,
    shellWorkspacePath,
    workspacePath,
  ]);

  useEffect(() => {
    const firstPosition = scan?.positions[0] ?? null;
    if (!firstPosition) {
      setSelection({ pos: null, roi: null, channel: null, timeIndex: 0, zIndex: 0 });
      return;
    }
    if (!scan?.positions.some((entry) => entry.pos === selection.pos)) {
      setSelection({ pos: firstPosition.pos });
    }
  }, [scan, selection.pos, setSelection]);

  useEffect(() => {
    if (!position) return;
    const patch = {
      channel: position.channels.includes(selection.channel ?? Number.NaN)
        ? selection.channel
        : (position.channels[0] ?? null),
      roi: position.rois.some((entry) => entry.roi === selection.roi)
        ? selection.roi
        : (position.rois[0]?.roi ?? null),
      timeIndex: clamp(selection.timeIndex, 0, Math.max(0, position.times.length - 1)),
      zIndex: clamp(selection.zIndex, 0, Math.max(0, position.zSlices.length - 1)),
    };
    if (
      patch.channel !== selection.channel ||
      patch.roi !== selection.roi ||
      patch.timeIndex !== selection.timeIndex ||
      patch.zIndex !== selection.zIndex
    ) {
      setSelection(patch);
    }
  }, [position, selection, setSelection]);

  useEffect(() => {
    setContrast(null);
  }, [activeSelectionKey, setContrast]);

  useEffect(() => {
    frameLoadIdRef.current += 1;
    const loadId = frameLoadIdRef.current;

    if (!workspacePath || workspacePath !== shellWorkspacePath || !request) {
      setFrame(null);
      setFrameLoading(false);
      return;
    }

    const abortController = new AbortController();
    const commit = (apply: () => void) => {
      if (frameLoadIdRef.current === loadId && !abortController.signal.aborted) apply();
    };

    setFrameLoading(true);
    setFrameError(null);
    setStatus("Loading ROI frame");

    const program = loadRoiFrameEffect(annotatorApi, workspacePath, request, contrast).pipe(
      Effect.tap((nextFrame) =>
        Effect.sync(() =>
          commit(() => {
            setFrame(nextFrame);
            setContrastState(nextFrame);
            setStatus(`Loaded Pos${request.pos} Roi${request.roi}`);
          }),
        ),
      ),
      Effect.catchAll((cause) =>
        Effect.sync(() =>
          commit(() => {
            setFrame(null);
            setFrameError(effectErrorMessage(cause, "ROI frame request failed"));
          }),
        ),
      ),
      Effect.ensuring(Effect.sync(() => commit(() => setFrameLoading(false)))),
    );

    void Effect.runPromiseExit(program, { signal: abortController.signal }).then((exit) => {
      if (!Exit.isFailure(exit) || abortController.signal.aborted) return;
      commit(() => {
        setFrame(null);
        setFrameError(effectErrorMessage(exit.cause, "ROI frame request failed"));
        setFrameLoading(false);
      });
    });

    return () => {
      abortController.abort();
    };
  }, [
    activeRequestKey,
    contrast,
    request,
    setContrastState,
    setFrame,
    setFrameError,
    setFrameLoading,
    setStatus,
    workspacePath,
    shellWorkspacePath,
  ]);

  useEffect(() => {
    annotationLoadIdRef.current += 1;
    const loadId = annotationLoadIdRef.current;

    if (!workspacePath || workspacePath !== shellWorkspacePath || !request || !frame) {
      resetAnnotation(emptyValueFor(frame));
      setAnnotationLoading(false);
      return;
    }

    const abortController = new AbortController();
    const commit = (apply: () => void) => {
      if (annotationLoadIdRef.current === loadId && !abortController.signal.aborted) apply();
    };

    setAnnotationLoading(true);
    setAnnotationError(null);
    setStatus("Loading ROI annotation");

    const program = loadRoiFrameAnnotationEffect(annotatorApi, workspacePath, request, frame).pipe(
      Effect.tap((value) =>
        Effect.sync(() =>
          commit(() => {
            resetAnnotation(value);
            setStatus(null);
          }),
        ),
      ),
      Effect.catchAll((cause) =>
        Effect.sync(() =>
          commit(() => {
            resetAnnotation(emptyValueFor(frame));
            setAnnotationError(effectErrorMessage(cause, "ROI annotation load failed"));
          }),
        ),
      ),
      Effect.ensuring(Effect.sync(() => commit(() => setAnnotationLoading(false)))),
    );

    void Effect.runPromiseExit(program, { signal: abortController.signal }).then((exit) => {
      if (!Exit.isFailure(exit) || abortController.signal.aborted) return;
      commit(() => {
        resetAnnotation(emptyValueFor(frame));
        setAnnotationError(effectErrorMessage(exit.cause, "ROI annotation load failed"));
        setAnnotationLoading(false);
      });
    });

    return () => {
      abortController.abort();
    };
  }, [
    activeRequestKey,
    frame,
    request,
    resetAnnotation,
    setAnnotationError,
    setAnnotationLoading,
    setStatus,
    workspacePath,
    shellWorkspacePath,
  ]);

  const handleSave = async () => {
    if (!shellWorkspacePath || !request || !frame || !canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const segmentationMask = maskHasPixels(annotation.current.mask);
      await saveAnnotationMutation.mutateAsync({
        request,
        annotation: {
          classificationLabelId: annotation.current.classificationLabelId,
          maskBase64Png: segmentationMask
            ? await encodeMaskToBase64Png(annotation.current.mask, frame.width, frame.height)
            : null,
        },
      });
      annotation.markSaved();
      setStatus("Saved ROI annotation");
    } catch (cause) {
      setSaveError(toAnnotatorErrorMessage(cause, "ROI annotation save failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLabels = async (nextLabels: AnnotationLabel[]) => {
    if (!shellWorkspacePath) {
      setLabelError("Select a workspace first.");
      return;
    }
    setLabelError(null);
    try {
      const savedLabels = await saveLabelsMutation.mutateAsync(nextLabels);
      setLabels(savedLabels);
      setActiveLabelId(savedLabels[0]?.id ?? null);
      setLabelDialogOpen(false);
    } catch (cause) {
      setLabelError(toAnnotatorErrorMessage(cause, "Annotation labels save failed"));
    }
  };

  return (
    <AppShell>
      <AppShell.Header>
        <ShellNavbar
          wsDefaultPort={8766}
          routeItems={[{ value: "roi", label: "ROI" }]}
          routeValue={props.routeId}
          showRouteToggle={false}
          showSourceButton={false}
          endLeading={
            <AnnotatorToolsMenu
              workspacePath={workspacePath}
              onCreateLabels={() => {
                setLabelError(null);
                setLabelDialogOpen(true);
              }}
            />
          }
          onRouteChange={(v: string) => navigate({ to: `/${v}` })}
          onPickWorkspace={() => setFilePickerOpen(true)}
        />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left widthClass="w-72">
          <LeftPanel
            channel={selection.channel}
            contrastDomain={contrastDomain}
            contrastMax={contrastMax}
            contrastMin={contrastMin}
            position={position}
            pos={selection.pos}
            roi={selection.roi}
            scan={scan}
            timeIndex={selection.timeIndex}
            zIndex={selection.zIndex}
            onChannelChange={(value) => changeSelection(() => setSelection({ channel: value }))}
            onContrastChange={setContrast}
            onPosChange={(value) =>
              changeSelection(() => {
                setSelection({ pos: value, roi: null });
              })
            }
            onRoiChange={(value) => changeSelection(() => setSelection({ roi: value }))}
            onTimeIndexChange={(value) => changeSelection(() => setSelection({ timeIndex: value }))}
            onZIndexChange={(value) => changeSelection(() => setSelection({ zIndex: value }))}
          />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <AnnotationCanvas
              activeLabelId={activeLabelId}
              brushSize={brushSize}
              disabled={!canEditSegmentation}
              frame={frame}
              labels={labels}
              mask={annotation.current.mask}
              messages={canvasMessages}
              overlayOpacity={overlayOpacity}
              tool={tool}
              onMaskCommit={(mask) =>
                annotation.commit({
                  classificationLabelId: annotation.current.classificationLabelId,
                  mask,
                })
              }
            />
          </AppShell.Main>
          <AppShell.Dock>
            <BottomPanel
              canSave={canSave}
              mode={mode}
              request={request}
              saving={saving}
              tool={tool}
              onSave={() => void handleSave()}
              onToolChange={setTool}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <RightPanel
            activeLabelId={activeLabelId}
            annotation={annotation.current}
            annotationError={annotationError}
            annotationLoading={annotationLoading}
            brushSize={brushSize}
            canRedo={annotation.canRedo}
            canEdit={canEdit}
            canUndo={annotation.canUndo}
            dirty={annotation.dirty}
            frameError={frameError}
            frameLoading={frameLoading}
            labels={labels}
            mode={mode}
            overlayOpacity={overlayOpacity}
            saveError={saveError}
            scanError={scanError}
            scanLoading={scanLoading}
            onClassificationChange={(labelId) =>
              annotation.commit({ classificationLabelId: labelId, mask: annotation.current.mask })
            }
            onClear={() =>
              frame &&
              annotation.commit({
                classificationLabelId: annotation.current.classificationLabelId,
                mask: createEmptyMask(frame.width, frame.height),
              })
            }
            onDiscard={annotation.discard}
            onBrushSizeChange={setBrushSize}
            onModeChange={setMode}
            onOverlayOpacityChange={setOverlayOpacity}
            onPaintLabelChange={setActiveLabelId}
            onRedo={annotation.redo}
            onUndo={annotation.undo}
          />
        </AppShell.Right>
      </AppShell.Body>
      <HostFilePickerDialog
        hostPort={annotatorApi}
        mode="workspace"
        open={filePickerOpen}
        title="Workspace folder"
        onOpenChange={setFilePickerOpen}
        onPickDirectory={(path) => {
          workspace.setWorkspacePath(path);
          setFilePickerOpen(false);
        }}
        onPickFile={() => undefined}
      />
      <LabelCreationDialog
        error={labelError}
        labels={labels}
        open={labelDialogOpen}
        saving={saveLabelsMutation.isPending}
        workspacePath={workspacePath}
        onOpenChange={setLabelDialogOpen}
        onSave={(nextLabels) => void handleSaveLabels(nextLabels)}
      />
    </AppShell>
  );
}

function LeftPanel(props: {
  scan: RoiWorkspaceScan | null;
  position: RoiPositionScan | null;
  pos: number | null;
  roi: number | null;
  channel: number | null;
  timeIndex: number;
  zIndex: number;
  contrastDomain: ContrastWindow;
  contrastMin: number;
  contrastMax: number;
  onPosChange: (value: number) => void;
  onRoiChange: (value: number) => void;
  onChannelChange: (value: number) => void;
  onTimeIndexChange: (value: number) => void;
  onZIndexChange: (value: number) => void;
  onContrastChange: (value: ContrastWindow) => void;
}) {
  const positionOptions = useMemo(
    () => toNavigationOptions(props.scan?.positions.map((entry) => entry.pos) ?? []),
    [props.scan],
  );
  const roiOptions = useMemo(
    () =>
      props.position?.rois.map((entry) => ({ value: entry.roi, label: String(entry.roi) })) ?? [],
    [props.position],
  );
  const channelOptions = useMemo(
    () => toNavigationOptions(props.position?.channels ?? []),
    [props.position],
  );
  const timeMax = Math.max(0, (props.position?.times.length ?? 1) - 1);
  const zMax = Math.max(0, (props.position?.zSlices.length ?? 1) - 1);

  const posValue = props.pos ?? positionOptions[0]?.value ?? 0;
  const roiValue = props.roi ?? roiOptions[0]?.value ?? 0;
  const channelValue = props.channel ?? channelOptions[0]?.value ?? 0;

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
          onChange: props.onPosChange,
          onPrevious: () => {
            const next = stepNavigationValue(positionOptions, posValue, -1);
            if (next != null) props.onPosChange(next);
          },
          onNext: () => {
            const next = stepNavigationValue(positionOptions, posValue, 1);
            if (next != null) props.onPosChange(next);
          },
        }}
        roi={{
          value: roiValue,
          options: roiOptions,
          disabled: roiOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(roiOptions, roiValue) <= 0,
          nextDisabled: findNavigationOptionIndex(roiOptions, roiValue) >= roiOptions.length - 1,
          onChange: props.onRoiChange,
          onPrevious: () => {
            const next = stepNavigationValue(roiOptions, roiValue, -1);
            if (next != null) props.onRoiChange(next);
          },
          onNext: () => {
            const next = stepNavigationValue(roiOptions, roiValue, 1);
            if (next != null) props.onRoiChange(next);
          },
        }}
        channel={{
          value: channelValue,
          options: channelOptions,
          disabled: channelOptions.length === 0,
          previousDisabled: findNavigationOptionIndex(channelOptions, channelValue) <= 0,
          nextDisabled:
            findNavigationOptionIndex(channelOptions, channelValue) >= channelOptions.length - 1,
          onChange: props.onChannelChange,
          onPrevious: () => {
            const next = stepNavigationValue(channelOptions, channelValue, -1);
            if (next != null) props.onChannelChange(next);
          },
          onNext: () => {
            const next = stepNavigationValue(channelOptions, channelValue, 1);
            if (next != null) props.onChannelChange(next);
          },
        }}
        timepoint={{
          value: props.timeIndex,
          min: 0,
          max: timeMax,
          step: 1,
          disabled: timeMax <= 0,
          previousDisabled: props.timeIndex <= 0,
          nextDisabled: props.timeIndex >= timeMax,
          onCommit: (value) => props.onTimeIndexChange(clamp(Math.round(value), 0, timeMax)),
          onPrevious: () => props.onTimeIndexChange(Math.max(0, props.timeIndex - 1)),
          onNext: () => props.onTimeIndexChange(Math.min(timeMax, props.timeIndex + 1)),
        }}
        zPlane={{
          value: props.zIndex,
          min: 0,
          max: zMax,
          step: 1,
          disabled: zMax <= 0,
          previousDisabled: props.zIndex <= 0,
          nextDisabled: props.zIndex >= zMax,
          onCommit: (value) => props.onZIndexChange(clamp(Math.round(value), 0, zMax)),
          onPrevious: () => props.onZIndexChange(Math.max(0, props.zIndex - 1)),
          onNext: () => props.onZIndexChange(Math.min(zMax, props.zIndex + 1)),
        }}
      />
      <ContrastControl
        domainMax={props.contrastDomain.max}
        domainMin={props.contrastDomain.min}
        maxValue={props.contrastMax}
        minValue={props.contrastMin}
        onAutoRange={() =>
          props.onContrastChange({ min: props.contrastDomain.min, max: props.contrastDomain.max })
        }
        onMaxCommit={(max) => props.onContrastChange({ min: props.contrastMin, max })}
        onMinCommit={(min) => props.onContrastChange({ min, max: props.contrastMax })}
      />
    </div>
  );
}

function RightPanel(props: {
  labels: AnnotationLabel[];
  mode: AnnotationMode;
  overlayOpacity: number;
  brushSize: number;
  activeLabelId: string | null;
  annotation: AnnotationValue;
  canEdit: boolean;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  scanLoading: boolean;
  frameLoading: boolean;
  annotationLoading: boolean;
  scanError: string | null;
  frameError: string | null;
  annotationError: string | null;
  saveError: string | null;
  onModeChange: (mode: AnnotationMode) => void;
  onOverlayOpacityChange: (value: number) => void;
  onBrushSizeChange: (value: number) => void;
  onClassificationChange: (labelId: string | null) => void;
  onPaintLabelChange: (labelId: string) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
}) {
  const activeError =
    props.scanError ?? props.frameError ?? props.annotationError ?? props.saveError;
  const loading = props.scanLoading || props.frameLoading || props.annotationLoading;

  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
      <Section title="Mode">
        <AnnotationModeToggle
          className="w-full"
          mode={props.mode}
          onModeChange={props.onModeChange}
        />
      </Section>
      <Section title="Labels" contentClassName="grid grid-cols-2 gap-2">
        {props.labels.map((label) => {
          const selected =
            props.mode === "classification"
              ? props.annotation.classificationLabelId === label.id
              : props.activeLabelId === label.id;
          return (
            <button
              key={label.id}
              className={cn(
                "min-w-0 truncate rounded-md border px-2 py-2 text-center text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50",
              )}
              disabled={!props.canEdit}
              style={labelColorStyle(label, selected)}
              type="button"
              title={label.name}
              onClick={() => {
                if (props.mode === "classification") {
                  props.onClassificationChange(selected ? null : label.id);
                } else {
                  props.onPaintLabelChange(label.id);
                }
              }}
            >
              {label.name}
            </button>
          );
        })}
        {props.labels.length === 0 ? (
          <div className="col-span-2 rounded-md border border-dashed border-border px-2 py-8 text-center text-muted-foreground text-xs">
            No labels loaded.
          </div>
        ) : null}
        {loading ? <p className="col-span-2 text-muted-foreground text-xs">Loading...</p> : null}
        {activeError ? <p className="col-span-2 text-destructive text-xs">{activeError}</p> : null}
      </Section>
      <Section title="Edit" contentClassName="grid grid-cols-2 gap-2">
        <Button
          disabled={!props.canUndo}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onUndo}
        >
          Undo
        </Button>
        <Button
          disabled={!props.canRedo}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onRedo}
        >
          Redo
        </Button>
        <Button
          disabled={props.mode !== "segmentation" || !props.canEdit}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onClear}
        >
          Clear
        </Button>
        <Button
          disabled={!props.dirty}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onDiscard}
        >
          Discard
        </Button>
      </Section>
      {props.mode === "segmentation" ? (
        <Section title="Brush" contentClassName="flex flex-col gap-3">
          <ToolSlider
            label="Opacity"
            max={0.95}
            min={0.05}
            step={0.01}
            value={props.overlayOpacity}
            valueLabel={`${Math.round(props.overlayOpacity * 100)}%`}
            onChange={props.onOverlayOpacityChange}
          />
          <ToolSlider
            label="Brush Size"
            max={32}
            min={1}
            step={1}
            value={props.brushSize}
            valueLabel={String(Math.round(props.brushSize))}
            onChange={(value) => props.onBrushSizeChange(Math.round(value))}
          />
        </Section>
      ) : null}
    </div>
  );
}

function BottomPanel(props: {
  mode: AnnotationMode;
  tool: AnnotationTool;
  request: RoiFrameRequest | null;
  canSave: boolean;
  saving: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onSave: () => void;
}) {
  const paths = annotationOutputPaths(props.request, props.mode);
  return (
    <div className="flex h-full min-h-0 w-full gap-3 p-3">
      <Section
        className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
        contentClassName="flex min-h-0 flex-1 flex-col gap-2"
        title="Tools"
      >
        {props.mode === "segmentation" ? (
          <>
            <div className="grid flex-1 grid-cols-2 gap-2">
              <Button
                className="h-full justify-center"
                type="button"
                variant={props.tool === "brush" ? "default" : "outline"}
                onClick={() => props.onToolChange("brush")}
              >
                Brush
              </Button>
              <Button
                className="h-full justify-center"
                type="button"
                variant={props.tool === "brush-erase" ? "default" : "outline"}
                onClick={() => props.onToolChange("brush-erase")}
              >
                Brush Erase
              </Button>
              <Button
                className="h-full justify-center"
                type="button"
                variant={props.tool === "lasso" ? "default" : "outline"}
                onClick={() => props.onToolChange("lasso")}
              >
                Lasso
              </Button>
              <Button
                className="h-full justify-center"
                type="button"
                variant={props.tool === "lasso-erase" ? "default" : "outline"}
                onClick={() => props.onToolChange("lasso-erase")}
              >
                Lasso Erase
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
            Classification
          </div>
        )}
      </Section>
      <Section
        className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
        contentClassName="flex min-h-0 flex-col gap-2"
        title="Save"
      >
        <div className={cn("grid min-w-0 gap-2", paths.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {paths.map((path) => (
            <OutputPathField key={path} value={path} />
          ))}
        </div>
        <Button
          className="w-full justify-center"
          disabled={!props.canSave}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onSave}
        >
          {props.saving ? "Saving" : "Save"}
        </Button>
      </Section>
    </div>
  );
}

function ToolSlider(props: {
  label: string;
  value: number;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-xs font-medium text-muted-foreground leading-tight">
          {props.label}
        </span>
        <span className="text-xs text-muted-foreground/80 tabular-nums">{props.valueLabel}</span>
      </div>
      <Slider
        className="w-full pt-0.5"
        max={props.max}
        min={props.min}
        step={props.step}
        value={props.value}
        onValueChange={props.onChange}
      />
    </div>
  );
}

function annotationOutputPaths(request: RoiFrameRequest | null, _mode: AnnotationMode) {
  if (!request) return ["annotations/roi/..."];
  const base = `annotations/roi/Pos${request.pos}/Roi${request.roi}/C${request.channel}_T${request.time}_Z${request.z}`;
  return [`${base}.json`, `${base}.png`];
}

function OutputPathField({ value }: { value: string }) {
  return (
    <div
      aria-label={`Output path ${value}`}
      className="min-w-0 truncate rounded-md border border-border bg-muted/20 px-2 py-1.5 font-mono text-xs text-foreground"
      title={value}
    >
      {value}
    </div>
  );
}

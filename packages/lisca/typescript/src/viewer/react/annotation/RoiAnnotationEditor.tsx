import type { AnnotationLabel } from "lisca/viewer/contracts";
import { Button, Input, Slider } from "lisca/viewer/ui";
import { Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  annotationValuesEqual,
  cloneAnnotationValue,
  coerceMask,
  colorStyle,
  createEmptyMask,
  labelColorMap,
  maskHasPixels,
  slugifyLabelId,
  type RoiAnnotationValue,
} from "./annotationUtils";
import RoiAnnotationCanvas from "./RoiAnnotationCanvas";
import type { RoiAnnotationEditorProps } from "./types";

export default function RoiAnnotationEditor({
  frame,
  labels,
  initialValue,
  resetKey,
  title = "ROI Annotation",
  subtitle,
  loading = false,
  error = null,
  className,
  initialBrushSize = 10,
  initialOverlayOpacity = 0.2,
  onClose,
  onSave,
  onLabelsChange,
}: RoiAnnotationEditorProps) {
  const initialSnapshotRef = useRef<RoiAnnotationValue>({
    classificationLabelId: initialValue.classificationLabelId,
    mask: coerceMask(initialValue.mask, frame.width, frame.height),
  });
  const [historyState, setHistoryState] = useState<{
    history: RoiAnnotationValue[];
    index: number;
    previewMask: Uint8Array | null;
  }>({
    history: [cloneAnnotationValue(initialSnapshotRef.current)],
    index: 0,
    previewMask: null,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [tool, setTool] = useState<"brush" | "erase">("brush");
  const [brushSize, setBrushSize] = useState(initialBrushSize);
  const [overlayOpacity, setOverlayOpacity] = useState(initialOverlayOpacity);
  const [activePaintLabelId, setActivePaintLabelId] = useState<string | null>(labels?.[0]?.id ?? null);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [labelSaveState, setLabelSaveState] = useState<{
    saving: boolean;
    error: string | null;
  }>({
    saving: false,
    error: null,
  });
  const [labelDraft, setLabelDraft] = useState({
    name: "",
    id: "",
    color: "#22c55e",
  });
  const [labelColorDrafts, setLabelColorDrafts] = useState<Record<string, string>>({});
  const [localLabels, setLocalLabels] = useState<AnnotationLabel[]>(labels ?? []);

  useEffect(() => {
    setLocalLabels(labels ?? []);
  }, [labels]);

  useEffect(() => {
    const nextInitial = {
      classificationLabelId: initialValue.classificationLabelId,
      mask: coerceMask(initialValue.mask, frame.width, frame.height),
    } satisfies RoiAnnotationValue;
    initialSnapshotRef.current = cloneAnnotationValue(nextInitial);
    setHistoryState({
      history: [cloneAnnotationValue(nextInitial)],
      index: 0,
      previewMask: null,
    });
    setSaveError(null);
  }, [frame.height, frame.width, initialValue.classificationLabelId, initialValue.mask, resetKey]);

  useEffect(() => {
    if (localLabels.length === 0) {
      setActivePaintLabelId(null);
      return;
    }
    if (!activePaintLabelId || !localLabels.some((label) => label.id === activePaintLabelId)) {
      setActivePaintLabelId(localLabels[0]?.id ?? null);
    }
  }, [activePaintLabelId, localLabels]);

  useEffect(() => {
    if (!labelManagerOpen) return;
    setLabelColorDrafts(labelColorMap(localLabels));
  }, [labelManagerOpen, localLabels]);

  const currentSnapshot = historyState.history[historyState.index] ?? initialSnapshotRef.current;
  const effectiveMask = historyState.previewMask ?? currentSnapshot.mask;
  const canManageLabels = !loading && !error && Boolean(onLabelsChange);
  const canEdit = !loading && !error && localLabels.length > 0;
  const dirty = useMemo(
    () => !annotationValuesEqual(currentSnapshot, initialSnapshotRef.current),
    [currentSnapshot],
  );
  const selectedClassificationLabel = localLabels.find(
    (label) => label.id === currentSnapshot.classificationLabelId,
  );
  const labelColorsDirty = useMemo(
    () =>
      localLabels.some((label) => (labelColorDrafts[label.id] ?? label.color) !== label.color),
    [labelColorDrafts, localLabels],
  );

  const commitSnapshot = useCallback((nextSnapshot: RoiAnnotationValue) => {
    setHistoryState((current) => {
      const active = current.history[current.index] ?? initialSnapshotRef.current;
      if (annotationValuesEqual(active, nextSnapshot)) {
        return { ...current, previewMask: null };
      }
      const history = current.history
        .slice(0, current.index + 1)
        .map((snapshot) => cloneAnnotationValue(snapshot));
      history.push(cloneAnnotationValue(nextSnapshot));
      return {
        history,
        index: history.length - 1,
        previewMask: null,
      };
    });
  }, []);

  const requestClose = useCallback(() => {
    if (dirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && labelManagerOpen) {
        event.preventDefault();
        setLabelManagerOpen(false);
        return;
      }
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (modifierPressed && event.key.toLowerCase() === "z") {
        event.preventDefault();
        setHistoryState((current) => {
          if (event.shiftKey) {
            if (current.index >= current.history.length - 1) return current;
            return { ...current, index: current.index + 1, previewMask: null };
          }
          if (current.index <= 0) return current;
          return { ...current, index: current.index - 1, previewMask: null };
        });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [labelManagerOpen, requestClose]);

  const handleClassificationChange = useCallback(
    (labelId: string | null) => {
      commitSnapshot({
        classificationLabelId:
          currentSnapshot.classificationLabelId === labelId ? null : labelId,
        mask: currentSnapshot.mask.slice(),
      });
    },
    [commitSnapshot, currentSnapshot],
  );

  const handleClearMask = useCallback(() => {
    commitSnapshot({
      classificationLabelId: currentSnapshot.classificationLabelId,
      mask: createEmptyMask(frame.width, frame.height),
    });
  }, [commitSnapshot, currentSnapshot.classificationLabelId, frame.height, frame.width]);

  const handleSave = useCallback(async () => {
    if (!canEdit || saving || loading) return;
    setSaving(true);
    setSaveError(null);
    try {
      const nextValue = cloneAnnotationValue(currentSnapshot);
      await onSave(nextValue);
      initialSnapshotRef.current = cloneAnnotationValue(nextValue);
      setHistoryState({
        history: [cloneAnnotationValue(nextValue)],
        index: 0,
        previewMask: null,
      });
    } catch (saveIssue) {
      setSaveError(
        saveIssue instanceof Error ? saveIssue.message : "Failed to save ROI annotation",
      );
    } finally {
      setSaving(false);
    }
  }, [canEdit, currentSnapshot, loading, onSave, saving]);

  const handleAddLabel = useCallback(async () => {
    if (!onLabelsChange || labelSaveState.saving) return;
    const name = labelDraft.name.trim();
    const id = (labelDraft.id.trim() || slugifyLabelId(name)).trim();
    if (!name) {
      setLabelSaveState({
        saving: false,
        error: "Label name is required.",
      });
      return;
    }
    if (!id) {
      setLabelSaveState({
        saving: false,
        error: "Label id is required.",
      });
      return;
    }
    if (localLabels.some((label) => label.id === id)) {
      setLabelSaveState({
        saving: false,
        error: `A label with id '${id}' already exists.`,
      });
      return;
    }

    setLabelSaveState({ saving: true, error: null });
    try {
      const nextLabels = [
        ...localLabels,
        {
          id,
          name,
          color: labelDraft.color,
        },
      ];
      const resolved = (await onLabelsChange(nextLabels)) ?? nextLabels;
      setLocalLabels(resolved);
      setActivePaintLabelId((current) => current ?? resolved[0]?.id ?? null);
      setLabelColorDrafts(labelColorMap(resolved));
      setLabelDraft({
        name: "",
        id: "",
        color: "#22c55e",
      });
      setLabelSaveState({ saving: false, error: null });
    } catch (labelIssue) {
      setLabelSaveState({
        saving: false,
        error:
          labelIssue instanceof Error ? labelIssue.message : "Failed to save annotation labels",
      });
    }
  }, [labelDraft.color, labelDraft.id, labelDraft.name, labelSaveState.saving, localLabels, onLabelsChange]);

  const handleSaveLabelColors = useCallback(async () => {
    if (!onLabelsChange || labelSaveState.saving || !labelColorsDirty) return;
    setLabelSaveState({ saving: true, error: null });
    try {
      const nextLabels = localLabels.map((label) => ({
        ...label,
        color: labelColorDrafts[label.id] ?? label.color,
      }));
      const resolved = (await onLabelsChange(nextLabels)) ?? nextLabels;
      setLocalLabels(resolved);
      setLabelColorDrafts(labelColorMap(resolved));
      setLabelSaveState({ saving: false, error: null });
    } catch (labelIssue) {
      setLabelSaveState({
        saving: false,
        error:
          labelIssue instanceof Error ? labelIssue.message : "Failed to save annotation labels",
      });
    }
  }, [labelColorDrafts, labelColorsDirty, labelSaveState.saving, localLabels, onLabelsChange]);

  return (
    <>
      <div className={`flex h-full min-h-0 flex-col overflow-hidden ${className ?? ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-medium text-foreground">{title}</h2>
              {dirty ? (
                <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200">
                  Unsaved
                </span>
              ) : null}
              {selectedClassificationLabel ? (
                <span
                  className="rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={colorStyle(selectedClassificationLabel.color, true)}
                >
                  {selectedClassificationLabel.name}
                </span>
              ) : null}
            </div>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex min-w-[16rem] max-w-[28rem] flex-wrap items-center justify-end gap-2 rounded-2xl border border-border bg-background/45 px-3 py-2">
              <span className="text-xs font-medium text-foreground">Label Set</span>
              {localLabels.length > 0 ? (
                <>
                  <div className="flex flex-wrap justify-end gap-2">
                    {localLabels.map((label) => (
                      <span
                        key={label.id}
                        className="rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={colorStyle(label.color, false)}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {localLabels.length} label{localLabels.length === 1 ? "" : "s"}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No labels yet</span>
              )}
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Manage annotation labels"
                disabled={!canManageLabels}
                onClick={() => {
                  setLabelSaveState({ saving: false, error: null });
                  setLabelManagerOpen(true);
                }}
              >
                <Settings className="size-4" />
              </button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-3 text-xs"
              onClick={requestClose}
            >
              Close
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_22rem] gap-0">
          <div className="min-h-0 border-r border-border p-5">
            <RoiAnnotationCanvas
              frame={frame}
              labels={localLabels}
              mask={effectiveMask}
              activeLabelId={activePaintLabelId}
              tool={tool}
              brushSize={brushSize}
              overlayOpacity={overlayOpacity}
              disabled={!canEdit || loading}
              className="h-full min-h-[28rem] w-full"
              onStrokeStart={() => setSaveError(null)}
              onPreviewMaskChange={(nextMask) =>
                setHistoryState((current) => ({ ...current, previewMask: nextMask.slice() }))
              }
              onStrokeCommit={(nextMask) =>
                commitSnapshot({
                  classificationLabelId: currentSnapshot.classificationLabelId,
                  mask: nextMask.slice(),
                })
              }
            />
          </div>

          <aside className="min-h-0 overflow-y-auto px-5 py-5">
            <div className="space-y-5">
              {loading ? (
                <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
                  Loading annotation...
                </div>
              ) : null}
              {error ? (
                <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
              {!loading && !error && localLabels.length === 0 ? (
                <div className="rounded-2xl border border-amber-400/35 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  No annotation labels are available for this editor.
                </div>
              ) : null}
              {saveError ? (
                <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {saveError}
                </div>
              ) : null}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-foreground">Classification</h3>
                  <span className="text-xs text-muted-foreground">
                    {currentSnapshot.classificationLabelId ? "1 selected" : "Optional"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {localLabels.map((label) => {
                    const active = currentSnapshot.classificationLabelId === label.id;
                    return (
                      <button
                        key={label.id}
                        type="button"
                        className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        style={colorStyle(label.color, active)}
                        disabled={!canEdit || loading}
                        onClick={() => handleClassificationChange(label.id)}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canEdit || loading}
                    onClick={() => handleClassificationChange(null)}
                  >
                    Clear
                  </button>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-foreground">Segmentation</h3>
                  <span className="text-xs text-muted-foreground">
                    {maskHasPixels(effectiveMask) ? "Mask present" : "No mask"}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Paint label</p>
                  <div className="flex flex-wrap gap-2">
                    {localLabels.map((label) => {
                      const active = activePaintLabelId === label.id;
                      return (
                        <button
                          key={label.id}
                          type="button"
                          className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          style={colorStyle(label.color, active)}
                          disabled={!canEdit || loading}
                          onClick={() => setActivePaintLabelId(label.id)}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={tool === "brush" ? "default" : "outline"}
                    className="h-9 text-xs"
                    disabled={!canEdit || loading}
                    onClick={() => setTool("brush")}
                  >
                    Brush
                  </Button>
                  <Button
                    size="sm"
                    variant={tool === "erase" ? "default" : "outline"}
                    className="h-9 text-xs"
                    disabled={!canEdit || loading}
                    onClick={() => setTool("erase")}
                  >
                    Erase
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">Brush size</p>
                    <span className="text-xs text-muted-foreground">{brushSize}px</span>
                  </div>
                  <Slider
                    value={brushSize}
                    min={1}
                    max={64}
                    step={1}
                    disabled={!canEdit || loading}
                    onValueChange={(value) => setBrushSize(Math.round(value))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">Overlay opacity</p>
                    <span className="text-xs text-muted-foreground">{overlayOpacity.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={overlayOpacity}
                    min={0.05}
                    max={0.95}
                    step={0.01}
                    onValueChange={(value) => setOverlayOpacity(value)}
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 w-full text-xs"
                  disabled={!canEdit || loading || !maskHasPixels(effectiveMask)}
                  onClick={handleClearMask}
                >
                  Clear mask
                </Button>
              </section>

              <section className="space-y-2 rounded-2xl border border-border bg-background/45 px-4 py-3">
                <h3 className="text-sm font-medium text-foreground">Shortcuts</h3>
                <p className="text-xs text-muted-foreground">
                  Paint on the frame with the active tool. Undo with Ctrl/Cmd+Z and redo with Ctrl/Cmd+Shift+Z.
                </p>
              </section>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {canEdit
              ? "Changes are stored only when you save."
              : "Saving is disabled until the annotation labels are available."}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-4 text-xs"
              onClick={requestClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 px-4 text-xs"
              disabled={!canEdit || loading || saving || !dirty}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {labelManagerOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !labelSaveState.saving) {
              setLabelManagerOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-[1.5rem] border border-border/80 bg-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="annotation-label-settings-title"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="space-y-1">
                <h2
                  id="annotation-label-settings-title"
                  className="text-base font-medium text-foreground"
                >
                  Annotation Label Settings
                </h2>
                <p className="text-sm text-muted-foreground">
                  Add labels and tune their colors for classification chips and semantic mask painting.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-3 text-xs"
                disabled={labelSaveState.saving}
                onClick={() => setLabelManagerOpen(false)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-5 px-5 py-5">
              {localLabels.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Current labels
                  </p>
                  <div className="space-y-2">
                    {localLabels.map((label) => (
                      <div
                        key={label.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/45 px-3 py-2"
                      >
                        <div className="min-w-0 space-y-1">
                          <span
                            className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
                            style={colorStyle(labelColorDrafts[label.id] ?? label.color, false)}
                          >
                            {label.name}
                          </span>
                          <p className="text-xs text-muted-foreground">{label.id}</p>
                        </div>
                        <Input
                          nativeInput
                          type="color"
                          size="sm"
                          className="h-9 w-14 shrink-0 overflow-hidden px-1.5"
                          value={labelColorDrafts[label.id] ?? label.color}
                          onChange={(event) =>
                            setLabelColorDrafts((current) => ({
                              ...current,
                              [label.id]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 px-3 text-xs"
                      disabled={!canManageLabels || labelSaveState.saving || !labelColorsDirty}
                      onClick={() => void handleSaveLabelColors()}
                    >
                      {labelSaveState.saving && labelColorsDirty ? "Saving colors..." : "Save colors"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-background/45 px-4 py-3 text-sm text-muted-foreground">
                  No labels yet. Add one below to enable annotation for this surface.
                </div>
              )}

              <div className="grid grid-cols-[minmax(0,1fr)_10rem] gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Label name</p>
                  <Input
                    size="sm"
                    value={labelDraft.name}
                    placeholder="Cell"
                    onChange={(event) => {
                      const name = event.target.value;
                      setLabelDraft((current) => ({
                        ...current,
                        name,
                        id: current.id.length > 0 ? current.id : slugifyLabelId(name),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Color</p>
                  <Input
                    nativeInput
                    type="color"
                    size="sm"
                    className="h-9 overflow-hidden px-1.5"
                    value={labelDraft.color}
                    onChange={(event) =>
                      setLabelDraft((current) => ({ ...current, color: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Label id</p>
                <Input
                  size="sm"
                  value={labelDraft.id}
                  placeholder="cell"
                  onChange={(event) =>
                    setLabelDraft((current) => ({ ...current, id: event.target.value }))
                  }
                />
              </div>

              {labelSaveState.error ? (
                <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {labelSaveState.error}
                </div>
              ) : null}

              <div className="flex justify-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-xs"
                  disabled={labelSaveState.saving}
                  onClick={() => setLabelManagerOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-9 px-3 text-xs"
                  disabled={!canManageLabels || labelSaveState.saving}
                  onClick={() => void handleAddLabel()}
                >
                  {labelSaveState.saving ? "Adding label..." : "Add label"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {discardConfirmOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div
            className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="annotation-discard-title"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 id="annotation-discard-title" className="text-base font-medium text-foreground">
                  Discard annotation changes?
                </h2>
                <p className="text-sm text-muted-foreground">
                  This frame has unsaved classification or segmentation edits.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => setDiscardConfirmOpen(false)}
                >
                  Keep editing
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    setDiscardConfirmOpen(false);
                    onClose();
                  }}
                >
                  Discard
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

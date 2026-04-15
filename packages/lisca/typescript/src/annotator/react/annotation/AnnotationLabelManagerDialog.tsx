import type { AnnotationLabel } from "lisca/viewer/contracts";
import { Button, Input } from "lisca/viewer/ui";
import { useEffect, useMemo, useRef, useState } from "react";

import { slugifyLabelId } from "./annotationUtils";
import { useRoiAnnotationContext } from "./RoiAnnotationContext";

function labelsEqual(a: AnnotationLabel[], b: AnnotationLabel[]): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((x) => [x.id, x]));
  for (const l of a) {
    const o = byId.get(l.id);
    if (!o || o.name !== l.name || o.color !== l.color) return false;
  }
  return true;
}

export default function AnnotationLabelManagerDialog() {
  const {
    labelManagerOpen,
    setLabelManagerOpen,
    labelSaveState,
    setLabelSaveState,
    localLabels,
    canManageLabels,
    commitAnnotationLabels,
  } = useRoiAnnotationContext();

  const [draftLabels, setDraftLabels] = useState<AnnotationLabel[]>([]);
  const [newLabel, setNewLabel] = useState({ name: "", id: "", color: "#22c55e" });
  const labelsRef = useRef(localLabels);
  labelsRef.current = localLabels;

  useEffect(() => {
    if (!labelManagerOpen) return;
    setDraftLabels(labelsRef.current.map((l) => ({ ...l })));
    setNewLabel({ name: "", id: "", color: "#22c55e" });
    setLabelSaveState({ saving: false, error: null });
  }, [labelManagerOpen, setLabelSaveState]);

  const dirty = useMemo(() => !labelsEqual(draftLabels, localLabels), [draftLabels, localLabels]);

  const handleColorChange = (labelId: string, color: string) => {
    setDraftLabels((prev) =>
      prev.map((l) => (l.id === labelId ? { ...l, color } : l)),
    );
  };

  const handleAddPending = () => {
    const name = newLabel.name.trim();
    const id = (newLabel.id.trim() || slugifyLabelId(name)).trim();
    if (!name) {
      setLabelSaveState({ saving: false, error: "Label name is required." });
      return;
    }
    if (!id) {
      setLabelSaveState({ saving: false, error: "Label id is required." });
      return;
    }
    if (draftLabels.some((label) => label.id === id)) {
      setLabelSaveState({ saving: false, error: `A label with id '${id}' already exists.` });
      return;
    }
    setLabelSaveState({ saving: false, error: null });
    setDraftLabels((prev) => [...prev, { id, name, color: newLabel.color }]);
    setNewLabel({ name: "", id: "", color: "#22c55e" });
  };

  const handleSave = async () => {
    if (!dirty || !canManageLabels || labelSaveState.saving) return;
    const ok = await commitAnnotationLabels(draftLabels);
    if (ok) setLabelManagerOpen(false);
  };

  if (!labelManagerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !labelSaveState.saving) {
          setLabelManagerOpen(false);
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border/80 bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="annotation-label-settings-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id="annotation-label-settings-title" className="text-sm font-medium text-foreground">
            Labels
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={!canManageLabels || labelSaveState.saving || !dirty}
              onClick={() => void handleSave()}
            >
              {labelSaveState.saving ? "Saving…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              disabled={labelSaveState.saving}
              onClick={() => setLabelManagerOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          {labelSaveState.error ? (
            <p className="text-xs text-red-400">{labelSaveState.error}</p>
          ) : null}

          {draftLabels.length > 0 ? (
            <div className="flex flex-col gap-2">
              {draftLabels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-3 rounded-lg border border-border/80 bg-card/50 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{label.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{label.id}</p>
                  </div>
                  <Input
                    nativeInput
                    type="color"
                    size="sm"
                    aria-label={`Color for ${label.name}`}
                    className="size-8 shrink-0 cursor-pointer overflow-hidden rounded border-0 p-0.5"
                    value={label.color}
                    onChange={(event) => handleColorChange(label.id, event.target.value)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No labels yet.</p>
          )}

          <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Add label</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Input
                  size="sm"
                  value={newLabel.name}
                  placeholder="Name"
                  onChange={(event) => {
                    const name = event.target.value;
                    setNewLabel((current) => ({
                      ...current,
                      name,
                      id: current.id.length > 0 ? current.id : slugifyLabelId(name),
                    }));
                  }}
                />
                <Input
                  size="sm"
                  className="font-mono text-xs"
                  value={newLabel.id}
                  placeholder="id"
                  onChange={(event) =>
                    setNewLabel((current) => ({ ...current, id: event.target.value }))
                  }
                />
              </div>
              <Input
                nativeInput
                type="color"
                size="sm"
                className="size-8 shrink-0 cursor-pointer overflow-hidden rounded border-0 p-0.5"
                value={newLabel.color}
                onChange={(event) =>
                  setNewLabel((current) => ({ ...current, color: event.target.value }))
                }
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0 text-xs"
                disabled={!canManageLabels || labelSaveState.saving}
                onClick={handleAddPending}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

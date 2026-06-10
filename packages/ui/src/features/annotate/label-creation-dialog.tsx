import type { AnnotationLabel } from "@lisca/contracts";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";

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

export type LabelCreationDialogProps = {
  open: boolean;
  labels: AnnotationLabel[];
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (labels: AnnotationLabel[]) => void;
  title?: string;
  subtitle?: string;
  workspacePath?: string | null;
  saving?: boolean;
  saveLabel?: string;
};

export function LabelCreationDialog({
  open,
  labels,
  error,
  onOpenChange,
  onSave,
  title = "Create labels",
  subtitle,
  workspacePath = null,
  saving = false,
  saveLabel = "Save labels",
}: LabelCreationDialogProps) {
  const [drafts, setDrafts] = useState<LabelDraft[]>(() => labelDraftsFrom(labels));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDrafts(labelDraftsFrom(labels));
      setLocalError(null);
    }
  }, [labels, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;

  const resolvedSubtitle =
    subtitle ?? (workspacePath != null ? workspacePath : "Select a workspace first");

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
    const nextLabels = drafts.map((draft) => ({
      id: normalizeLabelId(draft.id || draft.name),
      name: draft.name.trim(),
      color: draft.color.trim(),
    }));
    if (nextLabels.length === 0) {
      setLocalError("Add at least one label.");
      return;
    }
    if (nextLabels.some((label) => !label.id || !label.name || !label.color)) {
      setLocalError("Each label needs an id, name, and color.");
      return;
    }
    if (new Set(nextLabels.map((label) => label.id)).size !== nextLabels.length) {
      setLocalError("Label ids must be unique.");
      return;
    }
    onSave(nextLabels);
  };

  const activeError = localError ?? error;

  return (
    <ModalScrim
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <DialogSurface aria-labelledby="label-dialog-title" className="max-h-[86vh]" maxWidth="2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground text-lg" id="label-dialog-title">
              {title}
            </h2>
            <p className="truncate text-muted-foreground text-sm" title={resolvedSubtitle}>
              {resolvedSubtitle}
            </p>
          </div>
          <Button
            aria-label="Close label dialog"
            className="shrink-0"
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
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
              key={draft.id}
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={workspacePath != null ? !workspacePath : false}
            loading={saving}
            type="button"
            onClick={submit}
          >
            {saveLabel}
          </Button>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}

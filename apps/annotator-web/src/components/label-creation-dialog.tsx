import type { AnnotationLabel } from "@lisca/contracts";
import { Button, Input } from "@lisca/ui";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

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

export function LabelCreationDialog(props: {
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

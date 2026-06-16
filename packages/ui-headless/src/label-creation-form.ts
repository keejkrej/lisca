import type { AnnotationLabel } from "@lisca/contracts";
import { useEffect, useState } from "react";

export type LabelDraft = {
  /** Stable React list key — does not change when id/name are edited. */
  draftKey: string;
  id: string;
  name: string;
  color: string;
};

const defaultLabelDrafts: LabelDraft[] = [
  { draftKey: "class-1", id: "class-1", name: "Class 1", color: "#22c55e" },
  { draftKey: "class-2", id: "class-2", name: "Class 2", color: "#3b82f6" },
  { draftKey: "class-3", id: "class-3", name: "Class 3", color: "#f59e0b" },
];

export function normalizeLabelId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function labelDraftFrom(label: AnnotationLabel): LabelDraft {
  return { draftKey: label.id, ...label };
}

export function labelDraftsFrom(labels: AnnotationLabel[]): LabelDraft[] {
  return labels.length > 0 ? labels.map(labelDraftFrom) : defaultLabelDrafts.map((draft) => ({ ...draft }));
}

export function validateLabelDrafts(drafts: LabelDraft[]): string | null {
  const nextLabels = drafts.map((draft) => ({
    id: normalizeLabelId(draft.id || draft.name),
    name: draft.name.trim(),
    color: draft.color.trim(),
  }));
  if (nextLabels.length === 0) {
    return "Add at least one label.";
  }
  if (nextLabels.some((label) => !label.id || !label.name || !label.color)) {
    return "Each label needs an id, name, and color.";
  }
  if (new Set(nextLabels.map((label) => label.id)).size !== nextLabels.length) {
    return "Label ids must be unique.";
  }
  return null;
}

export function labelDraftsToLabels(drafts: LabelDraft[]): AnnotationLabel[] {
  return drafts.map((draft) => ({
    id: normalizeLabelId(draft.id || draft.name),
    name: draft.name.trim(),
    color: draft.color.trim(),
  }));
}

export type LabelCreationFormState = {
  drafts: LabelDraft[];
  localError: string | null;
  activeError: string | null;
  updateDraft: (index: number, patch: Partial<Omit<LabelDraft, "draftKey">>) => void;
  addDraft: () => void;
  removeDraft: (index: number) => void;
  submit: () => AnnotationLabel[] | null;
  resetFromLabels: (labels: AnnotationLabel[]) => void;
};

export function useLabelCreationForm(args: {
  open: boolean;
  labels: AnnotationLabel[];
  error: string | null;
}): LabelCreationFormState {
  const [drafts, setDrafts] = useState<LabelDraft[]>(() => labelDraftsFrom(args.labels));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (args.open) {
      setDrafts(labelDraftsFrom(args.labels));
      setLocalError(null);
    }
  }, [args.labels, args.open]);

  const updateDraft = (index: number, patch: Partial<Omit<LabelDraft, "draftKey">>) => {
    setDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)),
    );
  };

  const addDraft = () => {
    setDrafts((current) => [
      ...current,
      {
        draftKey: crypto.randomUUID(),
        id: `class-${current.length + 1}`,
        name: `Class ${current.length + 1}`,
        color: "#a855f7",
      },
    ]);
  };

  const removeDraft = (index: number) => {
    setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
  };

  const resetFromLabels = (labels: AnnotationLabel[]) => {
    setDrafts(labelDraftsFrom(labels));
    setLocalError(null);
  };

  const submit = (): AnnotationLabel[] | null => {
    const validationError = validateLabelDrafts(drafts);
    if (validationError) {
      setLocalError(validationError);
      return null;
    }
    setLocalError(null);
    return labelDraftsToLabels(drafts);
  };

  return {
    drafts,
    localError,
    activeError: localError ?? args.error,
    updateDraft,
    addDraft,
    removeDraft,
    submit,
    resetFromLabels,
  };
}

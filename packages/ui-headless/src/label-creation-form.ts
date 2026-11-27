import type { AnnotationLabel } from "@lisca/contracts";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type LabelDraft = {
  /** Stable list key — does not change when id/name are edited. */
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
  return labels.length > 0
    ? labels.map(labelDraftFrom)
    : defaultLabelDrafts.map((draft) => ({ ...draft }));
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

export type LabelCreationFormExternalState = {
  open: boolean;
  labels: AnnotationLabel[];
  error: string | null;
};

export type LabelCreationFormState = {
  drafts: LabelDraft[];
  localError: string | null;
  externalError: string | null;
  activeError: string | null;
};

export type LabelCreationFormListener = (state: LabelCreationFormState) => void;

export type LabelCreationFormController = {
  getState: () => LabelCreationFormState;
  subscribe: (listener: LabelCreationFormListener) => () => void;
  syncExternal: (next: LabelCreationFormExternalState) => void;
  updateDraft: (index: number, patch: Partial<Omit<LabelDraft, "draftKey">>) => void;
  addDraft: () => void;
  removeDraft: (index: number) => void;
  submit: () => AnnotationLabel[] | null;
  resetFromLabels: (labels: AnnotationLabel[]) => void;
};

export function createLabelCreationForm(
  initial: LabelCreationFormExternalState,
): LabelCreationFormController {
  let drafts: LabelDraft[] = labelDraftsFrom(initial.labels);
  let localError: string | null = null;
  let externalError: string | null = initial.error;
  let wasOpen = initial.open;
  let prevLabels = initial.labels;
  const listeners = new Set<LabelCreationFormListener>();

  const buildSnapshot = (): LabelCreationFormState => ({
    drafts,
    localError,
    externalError,
    activeError: localError ?? externalError,
  });

  let snapshot = buildSnapshot();

  const emit = () => {
    snapshot = buildSnapshot();
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const syncExternal = (next: LabelCreationFormExternalState) => {
    const shouldReset = next.open && (!wasOpen || next.labels !== prevLabels);
    const errorChanged = externalError !== next.error;
    wasOpen = next.open;
    prevLabels = next.labels;
    externalError = next.error;

    if (shouldReset) {
      drafts = labelDraftsFrom(next.labels);
      localError = null;
      emit();
      return;
    }

    if (errorChanged) {
      emit();
    }
  };

  const updateDraft = (index: number, patch: Partial<Omit<LabelDraft, "draftKey">>) => {
    drafts = drafts.map((draft, draftIndex) =>
      draftIndex === index ? { ...draft, ...patch } : draft,
    );
    emit();
  };

  const addDraft = () => {
    drafts = [
      ...drafts,
      {
        draftKey: generateId(),
        id: `class-${drafts.length + 1}`,
        name: `Class ${drafts.length + 1}`,
        color: "#a855f7",
      },
    ];
    emit();
  };

  const removeDraft = (index: number) => {
    drafts = drafts.filter((_, draftIndex) => draftIndex !== index);
    emit();
  };

  const resetFromLabels = (labels: AnnotationLabel[]) => {
    drafts = labelDraftsFrom(labels);
    localError = null;
    emit();
  };

  const submit = (): AnnotationLabel[] | null => {
    const validationError = validateLabelDrafts(drafts);
    if (validationError) {
      localError = validationError;
      emit();
      return null;
    }
    if (localError !== null) {
      localError = null;
      emit();
    }
    return labelDraftsToLabels(drafts);
  };

  return {
    getState: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncExternal,
    updateDraft,
    addDraft,
    removeDraft,
    submit,
    resetFromLabels,
  };
}

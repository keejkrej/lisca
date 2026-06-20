import type { AnnotationLabel } from "@lisca/contracts";
import { useLabelCreationForm, normalizeLabelId } from "@lisca/ui-headless/label-creation-form";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";

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
  const form = useLabelCreationForm({ open, labels, error });

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

  const submit = () => {
    const nextLabels = form.submit();
    if (nextLabels) onSave(nextLabels);
  };

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
          {form.drafts.map((draft, index) => (
            <div
              key={draft.draftKey}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem_2rem] items-center gap-2"
            >
              <Input
                aria-label={`Label ${index + 1} name`}
                value={draft.name}
                onChange={(event) => {
                  const name = event.target.value;
                  form.updateDraft(index, { name, id: normalizeLabelId(name) || draft.id });
                }}
              />
              <Input
                aria-label={`Label ${index + 1} id`}
                value={draft.id}
                onChange={(event) => form.updateDraft(index, { id: event.target.value })}
              />
              <Input
                aria-label={`Label ${index + 1} color`}
                nativeInput
                type="color"
                value={draft.color}
                onChange={(event) => form.updateDraft(index, { color: event.target.value })}
              />
              <Button
                aria-label={`Remove ${draft.name || `label ${index + 1}`}`}
                disabled={form.drafts.length <= 1}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => form.removeDraft(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            className="w-fit"
            size="sm"
            type="button"
            variant="outline"
            onClick={form.addDraft}
          >
            <Plus className="size-4" aria-hidden />
            Add label
          </Button>
          {form.activeError ? <p className="text-destructive text-sm">{form.activeError}</p> : null}
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

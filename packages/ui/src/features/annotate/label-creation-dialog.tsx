import type { AnnotationLabel } from "@lisca/contracts";
import { useLabelCreationForm, normalizeLabelId } from "@lisca/ui-headless/label-creation-form";
import IconPlusRegular from "phosphor-icons-solid/IconPlusRegular";
import IconTrashRegular from "phosphor-icons-solid/IconTrashRegular";
import IconXRegular from "phosphor-icons-solid/IconXRegular";
import { Index, onCleanup, onMount, Show } from "solid-js";

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

export function LabelCreationDialog(props: LabelCreationDialogProps) {
  const form = useLabelCreationForm(() => ({
    open: props.open,
    labels: props.labels,
    error: props.error,
  }));

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && props.open && !props.saving) props.onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  const resolvedSubtitle = () =>
    props.subtitle ??
    (props.workspacePath != null ? props.workspacePath : "Select a workspace first");

  const submit = () => {
    if (props.saving) return;
    const nextLabels = form.submit();
    if (nextLabels) props.onSave(nextLabels);
  };

  return (
    <Show when={props.open}>
      <ModalScrim
        onMouseDown={(event) => {
          if (!props.saving && event.target === event.currentTarget) props.onOpenChange(false);
        }}
      >
        <DialogSurface
          aria-busy={props.saving}
          aria-labelledby="label-dialog-title"
          class="max-h-[86vh]"
          maxWidth="2xl"
        >
          <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div class="min-w-0">
              <h2 class="font-semibold text-foreground text-lg" id="label-dialog-title">
                {props.title ?? "Create labels"}
              </h2>
              <p class="truncate text-muted-foreground text-sm" title={resolvedSubtitle()}>
                {resolvedSubtitle()}
              </p>
            </div>
            <Button
              aria-label="Close label dialog"
              class="shrink-0"
              disabled={props.saving}
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => props.onOpenChange(false)}
            >
              <IconXRegular class="size-4" />
            </Button>
          </div>

          <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-4">
            <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem_2rem] gap-2 px-1 text-muted-foreground text-xs">
              <span>Name</span>
              <span>ID</span>
              <span>Color</span>
              <span />
            </div>
            <Index each={form.drafts()}>
              {(draft, index) => (
                <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem_2rem] items-center gap-2">
                  <Input
                    autocomplete="off"
                    aria-label={`Label ${index + 1} name`}
                    disabled={props.saving}
                    name={`labels.${index}.name`}
                    value={draft().name}
                    onInput={(event) => {
                      const name = event.currentTarget.value;
                      form.updateDraft(index, { name, id: normalizeLabelId(name) || draft().id });
                    }}
                  />
                  <Input
                    autocomplete="off"
                    aria-label={`Label ${index + 1} id`}
                    disabled={props.saving}
                    name={`labels.${index}.id`}
                    spellcheck={false}
                    value={draft().id}
                    onInput={(event) => form.updateDraft(index, { id: event.currentTarget.value })}
                  />
                  <Input
                    autocomplete="off"
                    aria-label={`Label ${index + 1} color`}
                    disabled={props.saving}
                    name={`labels.${index}.color`}
                    type="color"
                    value={draft().color}
                    onInput={(event) =>
                      form.updateDraft(index, { color: event.currentTarget.value })
                    }
                  />
                  <Button
                    aria-label={`Remove ${draft().name || `label ${index + 1}`}`}
                    disabled={props.saving || form.drafts().length <= 1}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                    onClick={() => form.removeDraft(index)}
                  >
                    <IconTrashRegular class="size-4" />
                  </Button>
                </div>
              )}
            </Index>
            <Button
              class="w-fit"
              disabled={props.saving}
              size="sm"
              type="button"
              variant="outline"
              onClick={form.addDraft}
            >
              <IconPlusRegular class="size-4" />
              Add label
            </Button>
            <Show when={form.activeError()}>
              <p class="text-destructive text-sm" role="alert">
                {form.activeError()}
              </p>
            </Show>
          </div>

          <div class="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button
              disabled={props.saving}
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                props.saving || (props.workspacePath != null ? !props.workspacePath : false)
              }
              type="button"
              onClick={submit}
            >
              {props.saving ? "Saving…" : (props.saveLabel ?? "Save labels")}
            </Button>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}

import { createSignal, type JSX } from "solid-js";

import { useStudioAssaySave } from "../state/use-studio-assay-save";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";
import { AssaySaveConfirmModal } from "./assay-save-confirm-modal";

/**
 * New and Open replace the current assay, so unsaved changes get a
 * Save / Don't Save / Cancel prompt first (the File → New convention). Saving
 * still goes through the overwrite guard when assay.json already exists.
 */
export function useReplaceDocumentGuard() {
  const save = useStudioAssaySave();
  const [pending, setPending] = createSignal<(() => void) | null>(null);

  const replaceDocument = (action: () => void) => {
    if (save.dirty()) setPending(() => action);
    else action();
  };
  const runPending = () => {
    const action = pending();
    setPending(null);
    action?.();
  };
  const cancel = () => {
    save.setOverwriteOpen(false);
    save.setSaveError(null);
    setPending(null);
  };
  const saveThenRun = (overwrite: boolean) => {
    save.setOverwriteOpen(false);
    void save.saveAssay(overwrite).then((saved) => {
      if (saved) runPending();
    });
  };

  const prompts = (): JSX.Element => (
    <>
      <AssaySaveConfirmModal
        description="The current assay has unsaved changes. Save them first?"
        error={save.saveError()}
        open={pending() !== null && !save.overwriteOpen()}
        saving={save.saving()}
        skipLabel="Don't Save"
        title="Save changes?"
        onCancel={cancel}
        onSave={() => saveThenRun(false)}
        onSkip={runPending}
      />
      <AssayOverwriteConfirmModal
        open={pending() !== null && save.overwriteOpen()}
        saveTo={save.workspacePath()}
        onCancel={cancel}
        onOverwrite={() => saveThenRun(true)}
      />
    </>
  );

  return { save, replaceDocument, prompts };
}

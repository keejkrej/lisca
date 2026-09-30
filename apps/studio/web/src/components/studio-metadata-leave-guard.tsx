import { useBlocker } from "@tanstack/solid-router";

import { useStudioAssaySave } from "../state/use-studio-assay-save";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";
import { AssaySaveConfirmModal } from "./assay-save-confirm-modal";

export function StudioMetadataLeaveGuard() {
  const save = useStudioAssaySave();

  const blocker = useBlocker({
    shouldBlockFn: () => save.dirty(),
    withResolver: true,
    enableBeforeUnload: false,
  });

  const blocked = () => blocker().status === "blocked";

  const leaveWithoutSaving = () => {
    blocker().proceed?.();
  };

  const cancelLeave = () => {
    save.setOverwriteOpen(false);
    save.setSaveError(null);
    blocker().reset?.();
  };

  const saveAndLeave = async () => {
    const saved = await save.saveAssay(false);
    if (saved) blocker().proceed?.();
  };

  const overwriteAndLeave = async () => {
    save.setOverwriteOpen(false);
    const saved = await save.saveAssay(true);
    if (saved) blocker().proceed?.();
  };

  return (
    <>
      <AssaySaveConfirmModal
        error={save.saveError()}
        open={blocked() && !save.overwriteOpen()}
        saving={save.saving()}
        onCancel={cancelLeave}
        onSave={() => void saveAndLeave()}
        onSkip={leaveWithoutSaving}
      />
      <AssayOverwriteConfirmModal
        open={blocked() && save.overwriteOpen()}
        saveTo={save.workspacePath()}
        onCancel={cancelLeave}
        onOverwrite={() => void overwriteAndLeave()}
      />
    </>
  );
}

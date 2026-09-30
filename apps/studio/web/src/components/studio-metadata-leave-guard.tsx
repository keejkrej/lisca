import { useBlocker } from "@tanstack/solid-router";

import { useStudioAssaySave } from "../state/use-studio-assay-save";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";
import { AssaySaveConfirmModal } from "./assay-save-confirm-modal";

const METADATA_PATH = "/metadata";

/** Unsaved Metadata only matters when leaving Metadata, not when arriving there. */
export function shouldGuardMetadataLeave(from: string, to: string, dirty: boolean): boolean {
  return dirty && from === METADATA_PATH && to !== METADATA_PATH;
}

export function StudioMetadataLeaveGuard() {
  const save = useStudioAssaySave();

  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      shouldGuardMetadataLeave(current.pathname, next.pathname, save.dirty()),
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

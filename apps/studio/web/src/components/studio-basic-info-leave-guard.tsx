import {
  studioAssayJsonPathForSaveTo,
  touchStudioWorkSessionFromAssayPath,
} from "@lisca/client/session/work-session";
import { useBlocker } from "@tanstack/solid-router";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
import { createMemo, createSignal } from "solid-js";

import {
  assayDisplayLabel,
  buildStudioAssayJsonFromWizard,
  isBasicInfoDirty,
  serializeBasicInfoSnapshot,
  studioWizardActions,
  studioWizardAtom,
} from "../state/studio-store";
import { assayJsonExists, writeStudioAssayJson } from "../utils/save-studio-assay";
import { recordStudioAssayMemory } from "../utils/studio-memory";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";
import { AssaySaveConfirmModal } from "./assay-save-confirm-modal";

export function StudioBasicInfoLeaveGuard() {
  const wizard = useAtomValue(studioWizardAtom);
  const setWizard = useAtomSet(studioWizardAtom);
  const setBasicInfoSavedSnapshot = (snapshot: string | null) =>
    studioWizardActions.setBasicInfoSavedSnapshot(setWizard, snapshot);

  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [overwriteOpen, setOverwriteOpen] = createSignal(false);

  const dirty = createMemo(() => isBasicInfoDirty(wizard()));
  const workspacePath = createMemo(() => wizard().workspacePath.trim());

  const blocker = useBlocker({
    shouldBlockFn: () => dirty(),
    withResolver: true,
    enableBeforeUnload: false,
  });

  const blocked = () => blocker().status === "blocked";

  const saveAssay = async (overwrite: boolean) => {
    const current = wizard();
    if (!current.assayId || !workspacePath() || saving()) return false;
    setSaving(true);
    setSaveError(null);
    try {
      if (!overwrite && (await assayJsonExists(workspacePath()))) {
        setOverwriteOpen(true);
        return false;
      }
      const assayJson = buildStudioAssayJsonFromWizard(current);
      const label = assayDisplayLabel(assayJson);
      await writeStudioAssayJson(workspacePath(), assayJson);
      const assayJsonPath = studioAssayJsonPathForSaveTo(workspacePath());
      touchStudioWorkSessionFromAssayPath(assayJsonPath, label);
      recordStudioAssayMemory(assayJsonPath, label, workspacePath());
      setBasicInfoSavedSnapshot(serializeBasicInfoSnapshot(current));
      return true;
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : "Could not save assay.json. Check the save path and try again.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const leaveWithoutSaving = () => {
    blocker().proceed?.();
  };

  const cancelLeave = () => {
    setOverwriteOpen(false);
    setSaveError(null);
    blocker().reset?.();
  };

  const saveAndLeave = async () => {
    const saved = await saveAssay(false);
    if (saved) blocker().proceed?.();
  };

  const overwriteAndLeave = async () => {
    setOverwriteOpen(false);
    const saved = await saveAssay(true);
    if (saved) blocker().proceed?.();
  };

  return (
    <>
      <AssaySaveConfirmModal
        error={saveError()}
        open={blocked() && !overwriteOpen()}
        saving={saving()}
        onCancel={cancelLeave}
        onSave={() => void saveAndLeave()}
        onSkip={leaveWithoutSaving}
      />
      <AssayOverwriteConfirmModal
        open={overwriteOpen()}
        saveTo={workspacePath()}
        onCancel={cancelLeave}
        onOverwrite={() => void overwriteAndLeave()}
      />
    </>
  );
}

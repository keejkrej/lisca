import {
  studioAssayJsonPathForSaveTo,
  touchStudioWorkSessionFromAssayPath,
} from "@lisca/client/session/work-session";
import { useBlocker } from "@tanstack/solid-router";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";
import { createMemo, createSignal } from "solid-js";

import {
  buildStudioAssayJson,
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
  const saveTo = createMemo(() => wizard().info1.saveTo.trim());

  const blocker = useBlocker({
    shouldBlockFn: () => dirty(),
    withResolver: true,
    enableBeforeUnload: false,
  });

  const blocked = () => blocker().status === "blocked";

  const saveAssay = async (overwrite: boolean) => {
    const current = wizard();
    if (!current.assayId || !saveTo() || saving()) return false;
    setSaving(true);
    setSaveError(null);
    try {
      if (!overwrite && (await assayJsonExists(saveTo()))) {
        setOverwriteOpen(true);
        return false;
      }
      const assayJson = buildStudioAssayJson({
        assayId: current.assayId,
        dataSourceKind: current.dataSourceKind,
        info1: current.info1,
        info2: current.info2,
        info3: current.info3,
        analysis: current.analysis,
      });
      await writeStudioAssayJson(saveTo(), assayJson);
      const assayJsonPath = studioAssayJsonPathForSaveTo(saveTo());
      touchStudioWorkSessionFromAssayPath(assayJsonPath, assayJson.assayLabel);
      recordStudioAssayMemory(assayJsonPath, assayJson.assayLabel, saveTo());
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
        saveTo={saveTo()}
        onCancel={cancelLeave}
        onOverwrite={() => void overwriteAndLeave()}
      />
    </>
  );
}
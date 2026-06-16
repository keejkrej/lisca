"use client";

import {
  studioAssayJsonPathForSaveTo,
  touchStudioWorkSessionFromAssayPath,
} from "@lisca/client/session/work-session";
import { useBlocker } from "@tanstack/react-router";
import { useState } from "react";
import {
  buildStudioAssayJson,
  isBasicInfoDirty,
  serializeBasicInfoSnapshot,
  useStudioStore,
} from "../state/studio-store";
import { assayJsonExists, writeStudioAssayJson } from "../utils/save-studio-assay";
import { recordStudioAssayMemory } from "../utils/studio-memory";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";
import { AssaySaveConfirmModal } from "./assay-save-confirm-modal";

export function StudioBasicInfoLeaveGuard() {
  const wizard = useStudioStore((state) => state);
  const { assayId, dataSourceKind, info1, info2, info3, setBasicInfoSavedSnapshot } = wizard;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const dirty = isBasicInfoDirty(wizard);
  const saveTo = info1.saveTo.trim();
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
    enableBeforeUnload: false,
  });
  const blocked = status === "blocked";
  const saveAssay = async (overwrite: boolean) => {
    if (!assayId || !saveTo || saving) return false;
    setSaving(true);
    setSaveError(null);
    try {
      if (!overwrite && (await assayJsonExists(saveTo))) {
        setOverwriteOpen(true);
        return false;
      }
      const assayJson = buildStudioAssayJson({
        assayId,
        dataSourceKind,
        info1,
        info2,
        info3,
      });
      await writeStudioAssayJson(saveTo, assayJson);
      const assayJsonPath = studioAssayJsonPathForSaveTo(saveTo);
      touchStudioWorkSessionFromAssayPath(assayJsonPath, assayJson.assayLabel);
      recordStudioAssayMemory(
        assayJsonPath,
        assayJson.assayLabel,
        saveTo,
      );
      setBasicInfoSavedSnapshot(serializeBasicInfoSnapshot(wizard));
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
    proceed?.();
  };
  const cancelLeave = () => {
    setOverwriteOpen(false);
    setSaveError(null);
    reset?.();
  };
  const saveAndLeave = async () => {
    const saved = await saveAssay(false);
    if (saved) proceed?.();
  };
  const overwriteAndLeave = async () => {
    setOverwriteOpen(false);
    const saved = await saveAssay(true);
    if (saved) proceed?.();
  };
  return (
    <>
      <AssaySaveConfirmModal
        error={saveError}
        open={blocked && !overwriteOpen}
        saving={saving}
        onCancel={cancelLeave}
        onSave={() => void saveAndLeave()}
        onSkip={leaveWithoutSaving}
      />
      <AssayOverwriteConfirmModal
        open={overwriteOpen}
        saveTo={saveTo}
        onCancel={cancelLeave}
        onOverwrite={() => void overwriteAndLeave()}
      />
    </>
  );
}

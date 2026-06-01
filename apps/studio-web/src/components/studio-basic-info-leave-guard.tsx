"use client";

import { useBlocker } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import {
  buildStudioAssayJson,
  isBasicInfoDirty,
  serializeBasicInfoSnapshot,
  useStudioStore,
} from "../state/studio-store";
import { assayJsonExists, writeStudioAssayJson } from "../utils/save-studio-assay";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";
import { AssaySaveConfirmModal } from "./assay-save-confirm-modal";

export function StudioBasicInfoLeaveGuard() {
  const wizard = useStudioStore((state) => state);
  const {
    assayId,
    dataSourceKind,
    info1,
    info2,
    info3,
    setBasicInfoSavedSnapshot,
  } = wizard;

  const [saving, setSaving] = useState(false);
  const [overwriteOpen, setOverwriteOpen] = useState(false);

  const dirty = isBasicInfoDirty(wizard);
  const saveTo = info1.saveTo.trim();

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      current.pathname === "/info" && next.pathname !== "/info" && dirty,
    withResolver: true,
    enableBeforeUnload: dirty,
  });

  const blocked = status === "blocked";

  const saveAssay = useCallback(
    async (overwrite: boolean) => {
      if (!assayId || !saveTo || saving) return false;
      setSaving(true);
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
        setBasicInfoSavedSnapshot(serializeBasicInfoSnapshot(wizard));
        return true;
      } catch (cause) {
        window.alert(cause instanceof Error ? cause.message : String(cause));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      assayId,
      dataSourceKind,
      info1,
      info2,
      info3,
      saveTo,
      saving,
      setBasicInfoSavedSnapshot,
      wizard,
    ],
  );

  const leaveWithoutSaving = useCallback(() => {
    proceed?.();
  }, [proceed]);

  const cancelLeave = useCallback(() => {
    setOverwriteOpen(false);
    reset?.();
  }, [reset]);

  const saveAndLeave = useCallback(async () => {
    const saved = await saveAssay(false);
    if (saved) proceed?.();
  }, [proceed, saveAssay]);

  const overwriteAndLeave = useCallback(async () => {
    setOverwriteOpen(false);
    const saved = await saveAssay(true);
    if (saved) proceed?.();
  }, [proceed, saveAssay]);

  return (
    <>
      <AssaySaveConfirmModal
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

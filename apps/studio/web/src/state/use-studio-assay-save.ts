import {
  studioAssayJsonPathForSaveTo,
  touchStudioWorkSessionFromAssayPath,
} from "@lisca/client/session/work-session";
import { useAtomSet, useAtomValue } from "@effect/atom-solid";
import { createMemo, createSignal } from "solid-js";

import { assayJsonExists, writeStudioAssayJson } from "../utils/save-studio-assay";
import { recordStudioAssayMemory } from "../utils/studio-memory";
import {
  assayDisplayLabel,
  buildStudioAssayJsonFromWizard,
  isBasicInfoDirty,
  serializeBasicInfoSnapshot,
  studioWizardActions,
  studioWizardAtom,
} from "./studio-store";

/**
 * Save the Metadata wizard to `<workspace>/assay.json`.
 *
 * Two guards use this: the overwrite guard (`overwriteOpen`) whenever an assay.json already
 * exists there, and the route-leave guard for unsaved changes (`dirty`).
 */
export function useStudioAssaySave() {
  const wizard = useAtomValue(() => studioWizardAtom);
  const setWizard = useAtomSet(() => studioWizardAtom);

  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [overwriteOpen, setOverwriteOpen] = createSignal(false);

  const dirty = createMemo(() => isBasicInfoDirty(wizard()));
  const workspacePath = createMemo(() => wizard().workspacePath.trim());

  /** Resolves true once written; false when blocked, failed, or waiting on overwrite. */
  const saveAssay = async (overwrite: boolean) => {
    const current = wizard();
    if (!workspacePath()) {
      setSaveError("Pick a workspace folder before saving.");
      return false;
    }
    if (!current.assayId || saving()) return false;
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
      studioWizardActions.setBasicInfoSavedSnapshot(setWizard, serializeBasicInfoSnapshot(current));
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

  return {
    dirty,
    workspacePath,
    saving,
    saveError,
    setSaveError,
    overwriteOpen,
    setOverwriteOpen,
    saveAssay,
  };
}

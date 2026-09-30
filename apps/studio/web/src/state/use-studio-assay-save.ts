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
 * True when the last saved (or opened) assay lives in `workspacePath`, so writing there
 * updates this assay rather than replacing a different one.
 */
export function savedSnapshotOwnsWorkspace(
  snapshot: string | null,
  workspacePath: string,
): boolean {
  if (!snapshot || !workspacePath) return false;
  try {
    const saved = JSON.parse(snapshot) as { workspace?: { path?: unknown } };
    return (
      typeof saved.workspace?.path === "string" && saved.workspace.path.trim() === workspacePath
    );
  } catch {
    return false;
  }
}

/** Save the Metadata wizard to `<workspace>/assay.json`, asking before replacing another assay. */
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
      const ownsWorkspace = savedSnapshotOwnsWorkspace(
        current.basicInfoSavedSnapshot,
        workspacePath(),
      );
      if (!overwrite && !ownsWorkspace && (await assayJsonExists(workspacePath()))) {
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

import { logClientEvent } from "@lisca/client/client-log";
import {
  studioAssayJsonPathForSaveTo,
  touchStudioWorkSessionFromAssayPath,
} from "@lisca/client/session/work-session";

import { assayJsonExists, writeStudioAssayJson } from "../utils/save-studio-assay";
import { recordStudioAssayMemory } from "../utils/studio-memory";
import { studioRegistry } from "./studio-registry";
import {
  assayDisplayLabel,
  buildStudioAssayJsonFromWizard,
  isBasicInfoDirty,
  serializeBasicInfoSnapshot,
  studioStoreActions,
  studioWizardAtom,
} from "./studio-store";

export type StudioAssaySaveOutcome =
  | { readonly kind: "saved" }
  | { readonly kind: "needs_overwrite"; readonly saveTo: string }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "skipped" };

export function isStudioAssayDirty(): boolean {
  return isBasicInfoDirty(studioRegistry.get(studioWizardAtom));
}

export function getStudioAssayWorkspacePath(): string {
  return studioRegistry.get(studioWizardAtom).workspacePath.trim();
}

/**
 * Save the current Metadata wizard state to `<workspace>/assay.json`.
 * Returns a structured outcome so callers can open the overwrite modal or show errors.
 */
export async function saveStudioAssay(overwrite: boolean): Promise<StudioAssaySaveOutcome> {
  const current = studioRegistry.get(studioWizardAtom);
  const workspacePath = current.workspacePath.trim();
  if (!workspacePath) {
    return { kind: "error", message: "Pick a workspace folder before saving." };
  }
  if (!current.assayId) {
    return { kind: "skipped" };
  }
  try {
    if (!overwrite && (await assayJsonExists(workspacePath))) {
      return { kind: "needs_overwrite", saveTo: workspacePath };
    }
    const assayJson = buildStudioAssayJsonFromWizard(current);
    const label = assayDisplayLabel(assayJson);
    await writeStudioAssayJson(workspacePath, assayJson);
    const assayJsonPath = studioAssayJsonPathForSaveTo(workspacePath);
    touchStudioWorkSessionFromAssayPath(assayJsonPath, label);
    recordStudioAssayMemory(assayJsonPath, assayJson);
    studioStoreActions.setBasicInfoSavedSnapshot(serializeBasicInfoSnapshot(current));
    logClientEvent(`saved assay ${workspacePath}`);
    return { kind: "saved" };
  } catch (cause) {
    return {
      kind: "error",
      message:
        cause instanceof Error
          ? cause.message
          : "Could not save assay.json. Check the save path and try again.",
    };
  }
}

export type StudioAssaySaveState = {
  readonly saving: boolean;
  readonly saveError: string | null;
  readonly saveNotice: string | null;
  readonly overwriteOpen: boolean;
};

export type StudioAssaySaveController = {
  readonly dirty: () => boolean;
  readonly workspacePath: () => string;
  readonly getState: () => StudioAssaySaveState;
  readonly subscribe: (listener: (state: StudioAssaySaveState) => void) => () => void;
  readonly setSaveError: (error: string | null) => void;
  readonly setOverwriteOpen: (open: boolean) => void;
  readonly saveAssay: (overwrite: boolean) => Promise<boolean>;
};

/**
 * Framework-free controller for saving the Metadata wizard to `<workspace>/assay.json`.
 */
export function createStudioAssaySaveController(): StudioAssaySaveController {
  let state: StudioAssaySaveState = {
    saving: false,
    saveError: null,
    saveNotice: null,
    overwriteOpen: false,
  };
  const listeners = new Set<(next: StudioAssaySaveState) => void>();

  const update = (patch: Partial<StudioAssaySaveState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) {
      listener(state);
    }
  };

  const saveAssay = async (overwrite: boolean): Promise<boolean> => {
    if (state.saving) return false;
    update({ saving: true, saveError: null, saveNotice: null });
    try {
      const outcome = await saveStudioAssay(overwrite);
      switch (outcome.kind) {
        case "saved":
          update({ saveNotice: "Saved assay", overwriteOpen: false });
          return true;
        case "needs_overwrite":
          update({ overwriteOpen: true });
          return false;
        case "error":
          update({ saveError: outcome.message });
          return false;
        case "skipped":
          return false;
      }
    } finally {
      update({ saving: false });
    }
  };

  return {
    dirty: isStudioAssayDirty,
    workspacePath: getStudioAssayWorkspacePath,
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setSaveError: (saveError) => update({ saveError }),
    setOverwriteOpen: (overwriteOpen) => update({ overwriteOpen }),
    saveAssay,
  };
}

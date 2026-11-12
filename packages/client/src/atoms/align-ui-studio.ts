import { Atom } from "effect/unstable/reactivity";

import {
  createAlignUiActions,
  createInitialAlignUiState,
  createStudioPersist,
  type AlignUiAtom,
  type AlignUiState,
} from "./align-ui";

export const STUDIO_ALIGN_SESSION_KEY = "lisca-studio-align-session";

const studioPersist = createStudioPersist(STUDIO_ALIGN_SESSION_KEY);

/** Restores the log-std threshold and zoom lock preferences from the Studio align session record. */
export function createInitialStudioAlignUiState(): AlignUiState {
  const initial = createInitialAlignUiState();
  const session = studioPersist.read();
  return {
    ...initial,
    selection: session?.selection ?? initial.selection,
    spacingZoomLocked: session?.spacingZoomLocked ?? initial.spacingZoomLocked,
    patternZoomLocked: session?.patternZoomLocked ?? initial.patternZoomLocked,
    variationExcludeThreshold: session?.variationExcludeThreshold ?? null,
  };
}

export const studioAlignUiAtom: AlignUiAtom = Atom.make(createInitialStudioAlignUiState()).pipe(
  Atom.keepAlive,
);

export const studioAlignUiActions = createAlignUiActions(studioPersist, {
  clearSourceOnWorkspaceChange: false,
  preserveSelectionOnScan: true,
  skipRedundantSourceSet: true,
  includeApplySavedAlignState: true,
});

export type StudioAlignSessionPersist = Pick<
  AlignUiState,
  | "workspacePath"
  | "source"
  | "selection"
  | "spacingZoomLocked"
  | "patternZoomLocked"
  | "variationExcludeThreshold"
>;

export function readStudioAlignSession(): StudioAlignSessionPersist | null {
  const session = studioPersist.read();
  if (!session) return null;
  return {
    workspacePath: session.workspacePath ?? null,
    source: session.source ?? null,
    selection: session.selection ?? {
      pos: 0,
      channel: 0,
      time: 0,
      z: 0,
    },
    spacingZoomLocked: session.spacingZoomLocked ?? true,
    patternZoomLocked: session.patternZoomLocked ?? true,
    variationExcludeThreshold: session.variationExcludeThreshold ?? null,
  };
}

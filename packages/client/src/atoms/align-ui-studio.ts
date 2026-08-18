import {
  createAlignUiActions,
  createAlignUiAtom,
  createStudioPersist,
  type AlignUiAtom,
  type AlignUiState,
} from "./align-ui";

export const STUDIO_ALIGN_SESSION_KEY = "lisca-studio-align-session";

const studioPersist = createStudioPersist(STUDIO_ALIGN_SESSION_KEY);

export const studioAlignUiAtom: AlignUiAtom = createAlignUiAtom();

export const studioAlignUiActions = createAlignUiActions(studioPersist, {
  clearSourceOnWorkspaceChange: false,
  preserveSelectionOnScan: true,
  skipRedundantSourceSet: true,
  includeApplySavedAlignState: true,
});

export type StudioAlignSessionPersist = Pick<
  AlignUiState,
  "workspacePath" | "source" | "selection" | "spacingZoomLocked" | "patternZoomLocked"
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
  };
}

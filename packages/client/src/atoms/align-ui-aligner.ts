import {
  createAlignUiActions,
  createAlignUiAtom,
  createAlignerPersist,
  createInitialAlignUiState,
  hydrateAlignUi,
  type AlignUiAtom,
  type AlignUiState,
} from "./align-ui";

export const ALIGNER_SESSION_KEY = "lisca-aligner-session";

const alignerPersist = createAlignerPersist(ALIGNER_SESSION_KEY);

export const alignerAlignUiAtom: AlignUiAtom = createAlignUiAtom();

export const alignerAlignUiActions = createAlignUiActions(alignerPersist, {
  clearSourceOnWorkspaceChange: true,
  preserveSelectionOnScan: false,
  skipRedundantSourceSet: false,
  includeApplySavedAlignState: false,
});

export type AlignerSessionPersist = Pick<
  AlignUiState,
  "workspacePath" | "source" | "spacingZoomLocked" | "patternZoomLocked"
>;

export function readAlignerSession(): AlignerSessionPersist | null {
  const session = alignerPersist.read();
  if (!session) return null;
  return {
    workspacePath: session.workspacePath ?? null,
    source: session.source ?? null,
    spacingZoomLocked: session.spacingZoomLocked ?? true,
    patternZoomLocked: session.patternZoomLocked ?? true,
  };
}

export function createInitialAlignerUiState(): AlignUiState {
  const session = alignerPersist.read();
  if (!session) return createInitialAlignUiState();
  return {
    ...createInitialAlignUiState(),
    workspacePath: session.workspacePath ?? null,
    source: session.source ?? null,
    spacingZoomLocked: session.spacingZoomLocked ?? true,
    patternZoomLocked: session.patternZoomLocked ?? true,
  };
}

export function hydrateAlignerSession(set: Parameters<typeof hydrateAlignUi>[0]): void {
  hydrateAlignUi(set, alignerPersist);
}

/** @deprecated Use AlignUiState from @lisca/client/atoms/align-ui */
export type AlignerUiState = AlignUiState;

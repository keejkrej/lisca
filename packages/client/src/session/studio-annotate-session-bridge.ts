import type { AnnotatorUiActions, AnnotatorUiState, StateUpdater } from "../atoms/annotator-ui";

export type StudioAnnotateUiState = AnnotatorUiState;

export function studioAnnotateToAnnotatorUi<State extends AnnotatorUiState>(
  state: State,
): AnnotatorUiState {
  return state;
}

export function applyAnnotatorUiPatch<State extends AnnotatorUiState>(
  current: State,
  update: StateUpdater<AnnotatorUiState>,
): State {
  const nextAnnotator =
    typeof update === "function" ? update(studioAnnotateToAnnotatorUi(current)) : update;
  return {
    ...current,
    ...nextAnnotator,
  };
}

export function createStudioAnnotateSetUi<State extends AnnotatorUiState>(
  setUi: (update: StateUpdater<State>) => void,
): (update: StateUpdater<AnnotatorUiState>) => void {
  return (update) => {
    setUi((current) => applyAnnotatorUiPatch(current, update));
  };
}

export function createStudioAnnotateSessionActions<State extends AnnotatorUiState>(
  studioActions: AnnotatorUiActions<State>,
): AnnotatorUiActions<State> {
  return studioActions;
}

export type StudioAnnotateSessionBridge = {
  toAnnotatorUi: typeof studioAnnotateToAnnotatorUi;
  createSetUi: typeof createStudioAnnotateSetUi;
  createActions: typeof createStudioAnnotateSessionActions;
};

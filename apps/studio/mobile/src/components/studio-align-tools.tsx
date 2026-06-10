import { AlignToolToolbar } from "@lisca/ui-native";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioAlignTools({ state }: { state: StudioAlignState }) {
  return (
    <AlignToolToolbar
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      onModeChange={state.setToolMode}
      onPatternZoomLockedChange={state.setPatternZoomLocked}
    />
  );
}

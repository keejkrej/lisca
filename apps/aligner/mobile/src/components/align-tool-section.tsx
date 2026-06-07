import { AlignTools } from "@lisca/ui-native";

import type { AlignState } from "../state/use-align-state";

export function AlignToolSection({ state }: { state: AlignState }) {
  return (
    <AlignTools
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      onModeChange={(mode) => {
        if (!state.cropping) state.setToolMode(mode as typeof state.toolMode);
      }}
      onPatternZoomLockedChange={(locked) => {
        if (!state.cropping) state.setPatternZoomLocked(locked);
      }}
    />
  );
}

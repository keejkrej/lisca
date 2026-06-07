import { AlignTools } from "@lisca/ui-native";

import type { AlignState } from "../state/use-align-state";

export function AlignToolSection({ state }: { state: AlignState }) {
  return (
    <AlignTools
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      sectionContentStyle={{ flex: 1, minHeight: 0 }}
      sectionStyle={{ flex: 1, minWidth: 0 }}
      onModeChange={(mode) => {
        if (!state.cropping) state.setToolMode(mode);
      }}
      onPatternZoomLockedChange={(locked) => {
        if (!state.cropping) state.setPatternZoomLocked(locked);
      }}
    />
  );
}

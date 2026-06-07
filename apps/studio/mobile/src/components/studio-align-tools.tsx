import { AlignTools } from "@lisca/ui-native";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioAlignTools({ state }: { state: StudioAlignState }) {
  return (
    <AlignTools
      bare
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      sectionStyle={{ flex: 1, minHeight: 0, minWidth: 0, width: "100%" }}
      onModeChange={(mode) => {
        if (!state.cropping) state.setToolMode(mode);
      }}
      onPatternZoomLockedChange={(locked) => {
        if (!state.cropping) state.setPatternZoomLocked(locked);
      }}
    />
  );
}

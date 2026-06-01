import { AlignTools } from "@lisca/ui";

import type { AlignState } from "../state/use-align-state";

export function AlignToolSection({ state }: { state: AlignState }) {
  return (
    <AlignTools
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      sectionClassName="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
      sectionContentClassName="flex min-h-0 flex-1 flex-col"
      onModeChange={(mode) => {
        if (!state.cropping) state.setToolMode(mode);
      }}
      onPatternZoomLockedChange={(locked) => {
        if (!state.cropping) state.setPatternZoomLocked(locked);
      }}
      shortcutsEnabled={!state.cropping}
    />
  );
}

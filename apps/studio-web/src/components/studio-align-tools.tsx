import { AlignTools } from "@lisca/ui";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioAlignTools({ state }: { state: StudioAlignState }) {
  return (
    <AlignTools
      bare
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      sectionClassName="flex h-full min-h-0 min-w-0 w-full flex-col self-stretch"
      onModeChange={state.setToolMode}
      onPatternZoomLockedChange={state.setPatternZoomLocked}
      shortcutsEnabled={!state.cropping && !state.saving}
    />
  );
}

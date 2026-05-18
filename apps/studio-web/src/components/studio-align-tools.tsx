import { AlignTools } from "@lisca/ui";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioAlignTools({ state }: { state: StudioAlignState }) {
  return (
    <AlignTools
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      sectionClassName="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
      sectionContentClassName="flex min-h-0 flex-1 flex-col"
      onModeChange={state.setToolMode}
      onPatternZoomLockedChange={state.setPatternZoomLocked}
    />
  );
}

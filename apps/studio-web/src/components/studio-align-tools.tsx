import { AlignTools } from "@lisca/ui";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioAlignTools({ state }: { state: StudioAlignState }) {
  return (
    <AlignTools
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      sectionClassName="flex h-full min-h-0 min-w-0 flex-col"
      sectionTitle="Assay"
      sectionContentClassName="flex min-h-0 flex-1 flex-col"
      onModeChange={state.setToolMode}
      onPatternZoomLockedChange={state.setPatternZoomLocked}
    />
  );
}

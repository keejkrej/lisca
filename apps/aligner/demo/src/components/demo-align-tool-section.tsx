import { AlignTools } from "@lisca/ui/features";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignToolSection({ state }: { state: DemoAlignState }) {
  return (
    <AlignTools
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      onModeChange={state.setToolMode}
      onPatternZoomLockedChange={state.setPatternZoomLocked}
    />
  );
}

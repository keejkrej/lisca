import { AlignTools } from "@lisca/ui/features";
import { dockSectionClass } from "@lisca/ui/shell";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignToolSection({ state }: { state: DemoAlignState }) {
  return (
    <AlignTools
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      sectionClassName={dockSectionClass}
      onModeChange={state.setToolMode}
      onPatternZoomLockedChange={state.setPatternZoomLocked}
    />
  );
}

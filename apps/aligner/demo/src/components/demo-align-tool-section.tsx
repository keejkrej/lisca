import { AlignTools } from "@lisca/ui/features";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignToolSection({
  state,
  bare,
}: {
  state: DemoAlignState;
  bare?: boolean;
}) {
  return (
    <AlignTools
      bare={bare}
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      sectionClassName={
        bare ? "shrink-0 border-t border-border px-3 py-2 [&>div]:mx-auto [&>div]:max-w-lg" : undefined
      }
      onModeChange={state.setToolMode}
      onPatternZoomLockedChange={state.setPatternZoomLocked}
    />
  );
}

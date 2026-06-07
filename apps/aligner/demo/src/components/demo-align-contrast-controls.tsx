import { AlignContrastRail } from "@lisca/ui/features";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignContrastControls({ state }: { state: DemoAlignState }) {
  return (
    <AlignContrastRail
      contrast={state.contrast}
      disabled={!state.frame}
      frame={state.frame}
      onContrastChange={state.setContrast}
    />
  );
}

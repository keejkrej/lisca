import { ContrastControl } from "@lisca/ui/features";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignContrastControls({ state }: { state: DemoAlignState }) {
  return (
    <ContrastControl
      aria-label="Contrast"
      contrast={state.contrast}
      disabled={!state.frame}
      frame={state.frame}
      role="region"
      onContrastChange={state.setContrast}
    />
  );
}

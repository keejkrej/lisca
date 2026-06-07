import { AlignContrastRail } from "@lisca/ui/features";

import { useAlignPage } from "../state/align-page-context";

export function AlignContrastControls() {
  const { state } = useAlignPage();
  return (
    <AlignContrastRail
      contrast={state.contrast}
      disabled={!state.frame || state.cropping}
      frame={state.frame}
      onContrastChange={state.setContrast}
    />
  );
}

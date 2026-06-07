import { AlignGridRail } from "@lisca/ui/features";

import { useAlignPage } from "../state/align-page-context";

export function AlignGridControls() {
  const { state } = useAlignPage();
  return (
    <AlignGridRail
      disabled={state.cropping || !state.frame}
      grid={state.grid}
      onGridChange={state.setGrid}
    />
  );
}

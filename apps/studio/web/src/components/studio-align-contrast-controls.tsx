import { StudioContrastRail } from "@lisca/ui/features";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioAlignContrastControls() {
  const { state } = useStudioAlignPage();
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <StudioContrastRail
        contrast={state.contrast}
        disabled={!state.frame || state.frameLoading || state.cropping}
        frame={state.frame}
        onContrastChange={state.setContrast}
      />
    </div>
  );
}

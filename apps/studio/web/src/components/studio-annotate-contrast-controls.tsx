import { StudioContrastRail } from "@lisca/ui/features";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";

export function StudioAnnotateContrastControls() {
  const { state } = useStudioAnnotatePage();
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <StudioContrastRail
        contrast={state.contrast}
        disabled={!state.frame || state.frameLoading}
        frame={state.frame}
        onContrastChange={state.setContrast}
      />
    </div>
  );
}

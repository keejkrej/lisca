import { AlignTools } from "@lisca/ui/features";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioAlignTools() {
  const { state } = useStudioAlignPage();
  return (
    <AlignTools
      embedded
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      onModeChange={state.setToolMode}
      onPatternZoomLockedChange={state.setPatternZoomLocked}
      shortcutsEnabled={!state.cropping && !state.saving}
    />
  );
}

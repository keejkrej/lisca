import { AlignTools } from "@lisca/ui/features";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioAlignTools() {
  const { state } = useStudioAlignPage();
  return (
    <AlignTools
      bare
      mode={state.toolMode}
      patternZoomLocked={state.patternZoomLocked}
      sectionClassName="flex h-full min-h-0 min-w-0 w-full flex-col self-stretch"
      onModeChange={state.setToolMode}
      onPatternZoomLockedChange={state.setPatternZoomLocked}
      shortcutsEnabled={!state.cropping && !state.saving}
    />
  );
}

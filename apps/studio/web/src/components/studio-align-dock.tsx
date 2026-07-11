import { AlignToolToolbar } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioAlignDock() {
  const { state, varExclude, saveAndAdvance } = useStudioAlignPage();

  return (
    <DockStrip>
      <DockSection title="Tool">
        <AlignToolToolbar
          mode={state.toolMode}
          patternZoomLocked={state.patternZoomLocked}
          shortcutsEnabled={!state.cropping && !state.saving}
          onModeChange={state.setToolMode}
          onPatternZoomLockedChange={state.setPatternZoomLocked}
        />
      </DockSection>
      <DockSection title="Action">
        <div class="flex w-full flex-col gap-2">
          <div class="grid w-full grid-cols-2 gap-2">
            <Button
              class="w-full justify-center"
              disabled={!state.frame || state.saving || state.cropping}
              size="sm"
              type="button"
              variant="outline"
              onClick={state.resetCurrent}
            >
              Reset
            </Button>
            <Button
              class="w-full justify-center"
              disabled={
                !state.workspacePath ||
                state.alignPositions.length === 0 ||
                state.saving ||
                state.cropping ||
                state.findingFirstUnaligned
              }
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void state.goToFirstUnaligned()}
            >
              Jump
            </Button>
          </div>
          <div class="grid w-full grid-cols-2 gap-2">
            <Button
              class="w-full justify-center"
              disabled={!state.canGoBack || state.saving || state.cropping}
              size="sm"
              type="button"
              variant="outline"
              onClick={state.goBack}
            >
              Back
            </Button>
            <Button
              class="w-full justify-center"
              disabled={!state.frame || state.saving || state.cropping || varExclude.active()}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void saveAndAdvance()}
            >
              Next
            </Button>
          </div>
        </div>
      </DockSection>
    </DockStrip>
  );
}
import { AlignGridShapeDockSection, AlignToolToolbar } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";

import { instructionForStep } from "../state/studio-routes";
import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioAlignDock() {
  const { state, smartExclude, saveAndAdvance } = useStudioAlignPage();
  const gridDisabled = state.cropping || !state.frame;

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <p className="line-clamp-4 text-center text-sm leading-snug">
          {instructionForStep("alignPattern")}
        </p>
      </DockSection>
      <AlignGridShapeDockSection
        disabled={gridDisabled}
        shape={state.grid.shape}
        onShapeChange={(shape) =>
          state.setGrid((grid) => ({
            ...grid,
            shape,
          }))
        }
      />
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
        <div className="flex w-full flex-col gap-2">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              className="w-full justify-center"
              disabled={!state.frame || state.saving || state.cropping}
              size="sm"
              type="button"
              variant="outline"
              onClick={state.resetCurrent}
            >
              Reset
            </Button>
            <Button
              className="w-full justify-center"
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
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              className="w-full justify-center"
              disabled={!state.canGoBack || state.saving || state.cropping}
              size="sm"
              type="button"
              variant="outline"
              onClick={state.goBack}
            >
              Back
            </Button>
            <Button
              className="w-full justify-center"
              disabled={!state.frame || state.saving || state.cropping || smartExclude.busy}
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

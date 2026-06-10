import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";

import { instructionForStep } from "../state/studio-routes";
import { useStudioAlignPage } from "../state/studio-align-page-context";
import { StudioAlignTools } from "./studio-align-tools";
import { StudioInstructionSection } from "./studio-instruction-section";

const actionButtonClass = "w-full justify-center";

export function StudioAlignDock() {
  const { state } = useStudioAlignPage();

  return (
    <DockStrip panels={3}>
      <StudioInstructionSection>{instructionForStep("alignPattern")}</StudioInstructionSection>
      <DockSection title="Tool">
        <StudioAlignTools />
      </DockSection>
      <DockSection title="Action">
        <div className="flex w-full flex-col gap-2">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              className={actionButtonClass}
              disabled={!state.frame || state.saving || state.cropping}
              size="sm"
              type="button"
              variant="outline"
              onClick={state.resetCurrent}
            >
              Reset
            </Button>
            <Button
              className={actionButtonClass}
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
              className={actionButtonClass}
              disabled={!state.canGoBack || state.saving || state.cropping}
              size="sm"
              type="button"
              variant="outline"
              onClick={state.goBack}
            >
              Back
            </Button>
            <Button
              className={actionButtonClass}
              disabled={!state.frame || state.saving || state.cropping}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void state.saveAndAdvance()}
            >
              Next
            </Button>
          </div>
        </div>
      </DockSection>
    </DockStrip>
  );
}

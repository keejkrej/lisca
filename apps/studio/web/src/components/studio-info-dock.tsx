import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";

import { instructionForStep } from "../state/studio-routes";
import type { StudioStep } from "../state/studio-store";
import { StudioInstructionSection } from "./studio-instruction-section";

const actionButtonClass = "w-full max-w-48 justify-center";

export function StudioInfoDock(props: {
  step: StudioStep;
  infoStep: number;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <DockStrip panels={2}>
      <StudioInstructionSection>{instructionForStep(props.step)}</StudioInstructionSection>
      <DockSection title="Action">
        <div className="flex w-full flex-col gap-2">
          <Button
            className={actionButtonClass}
            disabled={props.infoStep === 1}
            size="sm"
            type="button"
            variant="outline"
            onClick={props.onBack}
          >
            Back
          </Button>
          <Button
            className={actionButtonClass}
            size="sm"
            type="button"
            variant="outline"
            onClick={props.onNext}
          >
            Next
          </Button>
        </div>
      </DockSection>
    </DockStrip>
  );
}

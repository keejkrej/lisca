import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";

import { instructionForStep } from "../state/studio-routes";
import type { StudioStep } from "../state/studio-store";

export function StudioInfoDock(props: {
  step: StudioStep;
  infoStep: number;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <p className="line-clamp-4 text-center text-sm leading-snug">
          {instructionForStep(props.step)}
        </p>
      </DockSection>
      <DockSection title="Action">
        <div className="flex flex-col gap-2">
          <Button
            className="w-full justify-center"
            disabled={props.infoStep === 1}
            size="sm"
            type="button"
            variant="outline"
            onClick={props.onBack}
          >
            Back
          </Button>
          <Button
            className="w-full justify-center"
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

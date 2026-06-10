import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";

import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { instructionForStep } from "../state/studio-routes";
import { useStudioStore } from "../state/studio-store";
import { StudioInstructionSection } from "./studio-instruction-section";

const actionButtonClass = "w-full max-w-48 justify-center";

export function StudioAssayDock(props: {
  openingAssay: boolean;
  assayPickerOpen: boolean;
  onOpenAssay: () => void;
}) {
  const { navigateTo } = useStudioNavigate();
  const setInfoStep = useStudioStore((state) => state.setInfoStep);

  return (
    <DockStrip panels={2}>
      <StudioInstructionSection>{instructionForStep("chooseAssay")}</StudioInstructionSection>
      <DockSection title="Action">
        <div className="flex w-full flex-col gap-2">
          <Button
            className={actionButtonClass}
            disabled={props.openingAssay || props.assayPickerOpen}
            size="sm"
            type="button"
            variant="outline"
            onClick={props.onOpenAssay}
          >
            Open assay
          </Button>
          <Button
            className={actionButtonClass}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              navigateTo("/info");
              setInfoStep(1);
            }}
          >
            Next
          </Button>
        </div>
      </DockSection>
    </DockStrip>
  );
}

import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";

import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { instructionForStep } from "../state/studio-routes";
import { useStudioStore } from "../state/studio-store";

export function StudioAssayDock(props: {
  openingAssay: boolean;
  assayPickerOpen: boolean;
  onOpenAssay: () => void;
}) {
  const { navigateTo } = useStudioNavigate();
  const setInfoStep = useStudioStore((state) => state.setInfoStep);

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <p className="line-clamp-4 text-center text-sm leading-snug">
          {instructionForStep("chooseAssay")}
        </p>
      </DockSection>
      <DockSection title="Action">
        <div className="flex flex-col gap-2">
          <Button
            className="w-full justify-center"
            disabled={props.openingAssay || props.assayPickerOpen}
            size="sm"
            type="button"
            variant="outline"
            onClick={props.onOpenAssay}
          >
            Open assay
          </Button>
          <Button
            className="w-full justify-center"
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

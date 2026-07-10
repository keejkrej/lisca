import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";
import { useAtomSet } from "@effect-atom/atom-solid";

import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { instructionForStep } from "../state/studio-routes";
import { studioWizardActions, studioWizardAtom } from "../state/studio-store";

export function StudioAssayDock(props: {
  openingAssay: boolean;
  assayPickerOpen: boolean;
  onOpenAssay: () => void;
}) {
  const { navigateTo } = useStudioNavigate();
  const setWizard = useAtomSet(studioWizardAtom);
  const setInfoStep = (step: Parameters<typeof studioWizardActions.setInfoStep>[1]) =>
    studioWizardActions.setInfoStep(setWizard, step);

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <p class="line-clamp-4 text-center text-sm leading-snug">
          {instructionForStep("chooseAssay")}
        </p>
      </DockSection>
      <DockSection title="Action">
        <div class="flex flex-col gap-2">
          <Button
            class="w-full justify-center"
            disabled={props.openingAssay || props.assayPickerOpen}
            size="sm"
            type="button"
            variant="outline"
            onClick={props.onOpenAssay}
          >
            Open assay
          </Button>
          <Button
            class="w-full justify-center"
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
import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";
import { useAtomSet } from "@effect/atom-solid";

import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { studioWizardActions, studioWizardAtom } from "../state/studio-store";

export function StudioAssayActions(props: {
  openingAssay: boolean;
  assayPickerOpen: boolean;
  onOpenAssay: () => void;
}) {
  const { navigateTo } = useStudioNavigate();
  const setWizard = useAtomSet(() => studioWizardAtom);
  const setInfoStep = (step: Parameters<typeof studioWizardActions.setInfoStep>[1]) =>
    studioWizardActions.setInfoStep(setWizard, step);

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          class="w-full justify-center rounded-full"
          disabled={props.openingAssay || props.assayPickerOpen}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onOpenAssay}
        >
          Open existing
        </Button>
        <Button
          class="w-full justify-center rounded-full"
          size="sm"
          type="button"
          onClick={() => {
            navigateTo("/info");
            setInfoStep(1);
          }}
        >
          Continue
        </Button>
      </RailControlStack>
    </PanelSection>
  );
}

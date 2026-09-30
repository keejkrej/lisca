import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";

import { useStudioNavigate } from "../navigation/use-studio-navigate";

export function StudioAssayActions(props: {
  openingAssay: boolean;
  assayPickerOpen: boolean;
  onNewAssay: () => void;
  onOpenAssay: () => void;
}) {
  const { navigateTo } = useStudioNavigate();

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          class="w-full justify-center"
          disabled={props.openingAssay}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onNewAssay}
        >
          New
        </Button>
        <Button
          class="w-full justify-center"
          disabled={props.openingAssay || props.assayPickerOpen}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onOpenAssay}
        >
          Open
        </Button>
        <Button
          class="w-full justify-center"
          size="sm"
          type="button"
          onClick={() => navigateTo("/metadata")}
        >
          Continue
        </Button>
      </RailControlStack>
    </PanelSection>
  );
}

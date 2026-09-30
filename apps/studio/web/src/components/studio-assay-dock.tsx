import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";

export function StudioAssayActions(props: {
  openingAssay: boolean;
  assayPickerOpen: boolean;
  onNewAssay: () => void;
  onOpenAssay: () => void;
}) {
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
      </RailControlStack>
    </PanelSection>
  );
}

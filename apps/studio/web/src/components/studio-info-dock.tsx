import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";

export function StudioInfoActions(props: { onBack: () => void; onNext: () => void }) {
  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          class="w-full justify-center rounded-full"
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onBack}
        >
          Back
        </Button>
        <Button
          class="w-full justify-center rounded-full"
          size="sm"
          type="button"
          onClick={props.onNext}
        >
          Continue
        </Button>
      </RailControlStack>
    </PanelSection>
  );
}

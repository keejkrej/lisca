import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";

export function StudioMetadataActions(props: { onNext: () => void }) {
  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button class="w-full justify-center" size="sm" type="button" onClick={props.onNext}>
          Continue
        </Button>
      </RailControlStack>
    </PanelSection>
  );
}

import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";

export function StudioInfoDock(props: {
  infoStep: number;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <DockStrip>
      <DockSection title="Action">
        <div class="flex flex-col gap-2">
          <Button
            class="w-full justify-center"
            disabled={props.infoStep === 1}
            size="sm"
            type="button"
            variant="outline"
            onClick={props.onBack}
          >
            Back
          </Button>
          <Button class="w-full justify-center" size="sm" type="button" onClick={props.onNext}>
            Continue
          </Button>
        </div>
      </DockSection>
    </DockStrip>
  );
}

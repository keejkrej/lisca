import { Button } from "../../components/ui/button";

import { AlignEditToggle } from "./align-edit-toggle";

export type AlignSelectionEditResetControlsProps = {
  disabled?: boolean;
  manualExclusionEnabled: boolean;
  onManualExclusionEnabledChange: (enabled: boolean) => void;
  onReset: () => void;
  resetDisabled?: boolean;
};

export function AlignSelectionEditResetControls(props: AlignSelectionEditResetControlsProps) {
  const disabled = () => props.disabled ?? false;
  const resetDisabled = () => props.resetDisabled ?? disabled();

  return (
    <div class="grid w-full grid-cols-2 gap-2">
      <AlignEditToggle
        disabled={disabled()}
        enabled={props.manualExclusionEnabled}
        onEnabledChange={props.onManualExclusionEnabledChange}
      />
      <Button
        class="w-full justify-center text-xs"
        disabled={resetDisabled()}
        size="sm"
        type="button"
        variant="outline"
        onClick={props.onReset}
      >
        Reset
      </Button>
    </div>
  );
}

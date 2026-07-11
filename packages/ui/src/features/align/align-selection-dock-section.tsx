import { DockSection } from "../../shell/regions/dock-section";

import { AlignSelectionEditResetControls } from "./align-selection-edit-reset-controls";

export type AlignSelectionDockSectionProps = {
  disabled?: boolean;
  manualExclusionEnabled: boolean;
  onManualExclusionEnabledChange: (enabled: boolean) => void;
  onReset: () => void;
  resetDisabled?: boolean;
  sectionTitle?: string;
};

export function AlignSelectionDockSection(props: AlignSelectionDockSectionProps) {
  return (
    <DockSection class="min-w-[9.5rem]" title={props.sectionTitle ?? "Selection"}>
      <AlignSelectionEditResetControls
        disabled={props.disabled}
        manualExclusionEnabled={props.manualExclusionEnabled}
        onManualExclusionEnabledChange={props.onManualExclusionEnabledChange}
        onReset={props.onReset}
        resetDisabled={props.resetDisabled}
      />
    </DockSection>
  );
}
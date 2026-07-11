import { PanelSection } from "../../shell/regions/panel-section";

import { AlignSelectionEditResetControls } from "./align-selection-edit-reset-controls";

export type AlignSelectionPanelSectionProps = {
  disabled?: boolean;
  manualExclusionEnabled: boolean;
  onManualExclusionEnabledChange: (enabled: boolean) => void;
  onReset: () => void;
  resetDisabled?: boolean;
  sectionTitle?: string;
};

export function AlignSelectionPanelSection(props: AlignSelectionPanelSectionProps) {
  return (
    <PanelSection title={props.sectionTitle ?? "Selection"}>
      <AlignSelectionEditResetControls
        disabled={props.disabled}
        manualExclusionEnabled={props.manualExclusionEnabled}
        onManualExclusionEnabledChange={props.onManualExclusionEnabledChange}
        onReset={props.onReset}
        resetDisabled={props.resetDisabled}
      />
    </PanelSection>
  );
}
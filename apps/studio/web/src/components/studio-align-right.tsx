import { AlignGridShapeToggle, AlignSelectionPanelSection } from "@lisca/ui/features";
import { PanelSection } from "@lisca/ui/shell";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioAlignRight() {
  const { state } = useStudioAlignPage();
  const disabled = () => state.cropping || !state.frame;

  return (
    <>
      <PanelSection title="Grid">
        <AlignGridShapeToggle
          disabled={disabled()}
          shape={state.grid.shape}
          onShapeChange={(shape) =>
            state.setGrid((grid) => ({
              ...grid,
              shape,
            }))
          }
        />
      </PanelSection>
      <AlignSelectionPanelSection
        disabled={disabled()}
        manualExclusionEnabled={state.manualExclusionEnabled}
        onManualExclusionEnabledChange={state.setManualExclusionEnabled}
        onReset={state.resetCurrent}
      />
    </>
  );
}

import { AlignGridRail } from "@lisca/ui/features";
import { RailSidebar } from "@lisca/ui/shell";

import { useAlignCanvas } from "../state/align-page-selectors";
import { AlignSelectionControls } from "./align-selection-controls";
import { AlignSaveSection } from "./align-save-section";

export function AlignerRight() {
  const canvas = useAlignCanvas();

  return (
    <RailSidebar>
      <AlignGridRail
        disabled={!canvas.frame}
        grid={canvas.grid}
        sectionAppearance="rail"
        onGridChange={canvas.setGrid}
      />
      <AlignSelectionControls />
      <AlignSaveSection />
    </RailSidebar>
  );
}

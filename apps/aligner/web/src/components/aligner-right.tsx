import { AlignGridRail } from "@lisca/ui/features";
import { SidebarStack } from "@lisca/ui/shell";

import { useAlignCanvas } from "../state/align-page-selectors";
import { AlignSelectionControls } from "./align-selection-controls";

export function AlignerRight() {
  const canvas = useAlignCanvas();

  return (
    <SidebarStack>
      <AlignGridRail disabled={!canvas.frame} grid={canvas.grid} onGridChange={canvas.setGrid} />
      <AlignSelectionControls />
    </SidebarStack>
  );
}

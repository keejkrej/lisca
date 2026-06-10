import { AlignGridRail } from "@lisca/ui/features";
import { SidebarStack } from "@lisca/ui/shell";

import { useAlignCanvas, useAlignCrop } from "../state/align-page-selectors";
import { AlignSelectionControls } from "./align-selection-controls";

export function AlignerRight() {
  const canvas = useAlignCanvas();
  const crop = useAlignCrop();

  return (
    <SidebarStack>
      <AlignGridRail
        disabled={crop.cropping || !canvas.frame}
        grid={canvas.grid}
        onGridChange={canvas.setGrid}
      />
      <AlignSelectionControls />
    </SidebarStack>
  );
}

import { AlignGridRail, SidebarStack } from "@lisca/ui-native";

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

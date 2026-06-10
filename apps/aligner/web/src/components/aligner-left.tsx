import { AlignContrastRail } from "@lisca/ui/features";
import { SidebarStack } from "@lisca/ui/shell";

import { useAlignCanvas, useAlignCrop } from "../state/align-page-selectors";
import { AlignFrameNavigation } from "./align-frame-navigation";

export function AlignerLeft() {
  const canvas = useAlignCanvas();
  const crop = useAlignCrop();

  return (
    <SidebarStack>
      <AlignFrameNavigation />
      <AlignContrastRail
        contrast={canvas.contrast}
        disabled={!canvas.frame || crop.cropping}
        frame={canvas.frame}
        onContrastChange={canvas.setContrast}
      />
    </SidebarStack>
  );
}

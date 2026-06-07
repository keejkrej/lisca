import { AlignContrastRail } from "@lisca/ui/features";

import { useAlignCanvas, useAlignCrop } from "../state/align-page-selectors";

export function AlignContrastControls() {
  const canvas = useAlignCanvas();
  const crop = useAlignCrop();
  return (
    <AlignContrastRail
      contrast={canvas.contrast}
      disabled={!canvas.frame || crop.cropping}
      frame={canvas.frame}
      onContrastChange={canvas.setContrast}
    />
  );
}

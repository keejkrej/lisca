import { AlignGridRail } from "@lisca/ui/features";

import { useAlignCanvas, useAlignCrop } from "../state/align-page-selectors";

export function AlignGridControls() {
  const canvas = useAlignCanvas();
  const crop = useAlignCrop();
  return (
    <AlignGridRail
      disabled={crop.cropping || !canvas.frame}
      grid={canvas.grid}
      onGridChange={canvas.setGrid}
    />
  );
}

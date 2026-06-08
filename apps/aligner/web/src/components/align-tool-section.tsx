import { AlignTools } from "@lisca/ui/features";

import { useAlignCanvas, useAlignCrop } from "../state/align-page-selectors";

export function AlignToolSection() {
  const canvas = useAlignCanvas();
  const crop = useAlignCrop();
  return (
    <AlignTools
      mode={canvas.toolMode}
      patternZoomLocked={canvas.patternZoomLocked}
      onModeChange={(mode) => {
        if (!crop.cropping) canvas.setToolMode(mode);
      }}
      onPatternZoomLockedChange={(locked) => {
        if (!crop.cropping) canvas.setPatternZoomLocked(locked);
      }}
      shortcutsEnabled={!crop.cropping}
    />
  );
}

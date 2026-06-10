import { AlignToolSection } from "@lisca/ui/features";

import { useAlignCanvas, useAlignCrop } from "../state/align-page-selectors";

export function AlignToolSectionPanel() {
  const canvas = useAlignCanvas();
  const crop = useAlignCrop();
  return (
    <AlignToolSection
      mode={canvas.toolMode}
      patternZoomLocked={canvas.patternZoomLocked}
      shortcutsEnabled={!crop.cropping}
      onModeChange={(mode) => {
        if (!crop.cropping) canvas.setToolMode(mode);
      }}
      onPatternZoomLockedChange={(locked) => {
        if (!crop.cropping) canvas.setPatternZoomLocked(locked);
      }}
    />
  );
}

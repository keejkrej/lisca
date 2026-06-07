import { AlignTools } from "@lisca/ui/features";

import { useAlignCanvas, useAlignCrop } from "../state/align-page-selectors";

export function AlignToolSection() {
  const canvas = useAlignCanvas();
  const crop = useAlignCrop();
  return (
    <AlignTools
      mode={canvas.toolMode}
      patternZoomLocked={canvas.patternZoomLocked}
      sectionClassName="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
      sectionContentClassName="flex min-h-0 flex-1 flex-col"
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

import { AlignToolSection, DockStrip } from "@lisca/ui-native";

import { useAlignCanvas, useAlignCrop } from "../state/align-page-selectors";
import { AlignSaveSection } from "./align-save-section";

export function AlignerDock() {
  const canvas = useAlignCanvas();
  const crop = useAlignCrop();

  return (
    <DockStrip>
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
      <AlignSaveSection />
    </DockStrip>
  );
}

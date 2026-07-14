import { AlignToolSection } from "@lisca/ui/features";
import { DockStrip } from "@lisca/ui/shell";

import { useAlignCanvas } from "../state/align-page-selectors";
import { AlignSaveSection } from "./align-save-section";

export function AlignerDock() {
  const canvas = useAlignCanvas();

  return (
    <DockStrip>
      <AlignToolSection
        mode={canvas.toolMode}
        patternZoomLocked={canvas.patternZoomLocked}
        shortcutsEnabled
        onModeChange={canvas.setToolMode}
        onPatternZoomLockedChange={canvas.setPatternZoomLocked}
      />
      <AlignSaveSection />
    </DockStrip>
  );
}

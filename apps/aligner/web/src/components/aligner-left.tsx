import { AlignToolSection, ContrastControl } from "@lisca/ui/features";
import { RailSidebar } from "@lisca/ui/shell";

import { useAlignCanvas } from "../state/align-page-selectors";
import { AlignFrameNavigation } from "./align-frame-navigation";

export function AlignerLeft() {
  const canvas = useAlignCanvas();

  return (
    <RailSidebar>
      <AlignFrameNavigation />
      <ContrastControl
        aria-label="Contrast"
        contrast={canvas.contrast}
        disabled={!canvas.frame}
        frame={canvas.frame}
        role="region"
        sectionAppearance="rail"
        sectionClassName="min-h-0 shrink-0"
        sectionContentClassName="flex min-h-0 flex-col"
        onContrastChange={canvas.setContrast}
      />
      <AlignToolSection
        mode={canvas.toolMode}
        spacingZoomLocked={canvas.spacingZoomLocked}
        patternZoomLocked={canvas.patternZoomLocked}
        placement="rail"
        shortcutsEnabled
        onModeChange={canvas.setToolMode}
        onSpacingZoomLockedChange={canvas.setSpacingZoomLocked}
        onPatternZoomLockedChange={canvas.setPatternZoomLocked}
      />
    </RailSidebar>
  );
}

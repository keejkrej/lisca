import { ContrastControl } from "@lisca/ui/features";
import { SidebarStack } from "@lisca/ui/shell";

import { useAlignCanvas } from "../state/align-page-selectors";
import { AlignFrameNavigation } from "./align-frame-navigation";

export function AlignerLeft() {
  const canvas = useAlignCanvas();

  return (
    <SidebarStack>
      <AlignFrameNavigation />
      <ContrastControl
        aria-label="Contrast"
        contrast={canvas.contrast}
        disabled={!canvas.frame}
        frame={canvas.frame}
        role="region"
        sectionClassName="min-h-0 shrink-0"
        sectionContentClassName="flex min-h-0 flex-col overflow-auto"
        onContrastChange={canvas.setContrast}
      />
    </SidebarStack>
  );
}

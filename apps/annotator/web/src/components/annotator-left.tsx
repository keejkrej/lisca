import { ContrastControl } from "@lisca/ui/features";
import { SidebarStack } from "@lisca/ui/shell";

import { useAnnotateNav } from "../state/annotate-page-selectors";
import { AnnotatorFrameNavigation } from "./annotator-frame-navigation";

export function AnnotatorLeft() {
  const nav = useAnnotateNav();

  return (
    <SidebarStack>
      <AnnotatorFrameNavigation />
      <ContrastControl
        aria-label="Contrast"
        contrast={nav.contrast}
        disabled={!nav.frame}
        frame={nav.frame}
        role="region"
        sectionClassName="min-h-0 shrink-0"
        sectionContentClassName="flex min-h-0 flex-col overflow-auto"
        onContrastChange={nav.setContrast}
      />
    </SidebarStack>
  );
}

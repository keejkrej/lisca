import { ContrastControl, RoiFrameNavigation } from "@lisca/ui/features";
import { Show } from "solid-js";

import { useStudioAnnotateNav } from "../state/studio-annotate-page-selectors";

export function StudioAnnotateNav() {
  const nav = useStudioAnnotateNav();

  return (
    <Show
      when={!nav.workspaceMissing}
      fallback={<p class="text-destructive text-sm">Choose a workspace on the Info step first.</p>}
    >
      <>
        <RoiFrameNavigation
          changeSelection={nav.changeSelection}
          position={nav.position}
          scan={nav.scan}
          sectionAppearance="rail"
          selection={nav.selection}
          setSelection={nav.setSelection}
        />
        <ContrastControl
          aria-label="Contrast"
          contrast={nav.contrast}
          disabled={!nav.frame}
          frame={nav.frame}
          role="region"
          sectionAppearance="rail"
          sectionClassName="min-h-0 shrink-0"
          sectionContentClassName="flex min-h-0 flex-col"
          onContrastChange={nav.setContrast}
        />
      </>
    </Show>
  );
}

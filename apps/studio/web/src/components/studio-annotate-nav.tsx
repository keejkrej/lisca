import { ContrastControl, RoiFrameNavigation } from "@lisca/ui/features";
import { Show } from "solid-js";

import { useStudioAnnotateNav } from "../state/studio-annotate-page-selectors";

export function StudioAnnotateNav() {
  const nav = useStudioAnnotateNav();

  return (
    <Show
      when={!nav.workspaceMissing}
      fallback={
        <div class="flex min-h-0 flex-col gap-2.5">
          <p class="text-destructive text-sm">Set a save location in Basic info first.</p>
        </div>
      }
    >
      <div class="flex min-h-0 flex-col gap-2.5">
        <RoiFrameNavigation
          changeSelection={nav.changeSelection}
          position={nav.position}
          scan={nav.scan}
          selection={nav.selection}
          setSelection={nav.setSelection}
        />
        <ContrastControl
          aria-label="Contrast"
          contrast={nav.contrast}
          disabled={!nav.frame}
          frame={nav.frame}
          role="region"
          onContrastChange={nav.setContrast}
        />
      </div>
    </Show>
  );
}

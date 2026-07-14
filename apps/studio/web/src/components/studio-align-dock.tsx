import { AlignToolToolbar } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip } from "@lisca/ui/shell";
import { createMemo } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";

/** Frame load does not touch the dock — only suppress disabled-state opacity flicker. */
const DOCK_STRIP_CLASS =
  "[&_button]:transition-none [&_button]:disabled:opacity-100 [&_button]:disabled:saturate-100";

export function StudioAlignDock() {
  const { state, excludeActive, runExclude, saveAndAdvance } = useStudioAlignPage();
  const actionBusy = createMemo(() => state.saving);
  const frameReady = createMemo(() => Boolean(state.frame));

  return (
    <DockStrip class={DOCK_STRIP_CLASS}>
      <DockSection title="Tool">
        <AlignToolToolbar
          mode={state.toolMode}
          patternZoomLocked={state.patternZoomLocked}
          shortcutsEnabled
          onModeChange={state.setToolMode}
          onPatternZoomLockedChange={state.setPatternZoomLocked}
        />
      </DockSection>
      <DockSection title="Action">
        <div class="flex w-full flex-col gap-2">
          <div class="grid w-full grid-cols-2 gap-2">
            <Button
              class="w-full justify-center"
              disabled={actionBusy() || !frameReady() || excludeActive()}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void runExclude()}
            >
              Exclude
            </Button>
            <Button
              class="w-full justify-center"
              disabled={actionBusy() || state.findingFirstUnaligned}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void state.goToFirstUnaligned()}
            >
              Jump
            </Button>
          </div>
          <div class="grid w-full grid-cols-2 gap-2">
            <Button
              class="w-full justify-center"
              disabled={actionBusy() || !state.canGoBack}
              size="sm"
              type="button"
              variant="outline"
              onClick={state.goBack}
            >
              Back
            </Button>
            <Button
              class="w-full justify-center"
              disabled={actionBusy() || !frameReady()}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void saveAndAdvance()}
            >
              Next
            </Button>
          </div>
        </div>
      </DockSection>
    </DockStrip>
  );
}

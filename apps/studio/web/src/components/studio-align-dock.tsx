import { AlignToolToolbar } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack, RailSectionStack } from "@lisca/ui/shell";
import { createMemo } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";

/** Frame load does not touch the rail — only suppress disabled-state opacity flicker. */
const RAIL_CLASS =
  "[&_button]:transition-none [&_button]:disabled:opacity-100 [&_button]:disabled:saturate-100";

export function StudioAlignControls() {
  const { state, excludeActive, runExclude, saveAndAdvance } = useStudioAlignPage();
  const actionBusy = createMemo(() => state.saving);
  const frameReady = createMemo(() => Boolean(state.frame));

  return (
    <RailSectionStack class={RAIL_CLASS}>
      <PanelSection appearance="rail" title="Tool">
        <AlignToolToolbar
          layout="rail"
          mode={state.toolMode}
          spacingZoomLocked={state.spacingZoomLocked}
          patternZoomLocked={state.patternZoomLocked}
          shortcutsEnabled
          onModeChange={state.setToolMode}
          onSpacingZoomLockedChange={state.setSpacingZoomLocked}
          onPatternZoomLockedChange={state.setPatternZoomLocked}
        />
      </PanelSection>
      <PanelSection appearance="rail" title="Action">
        <RailControlStack>
          <Button
            class="w-full justify-center rounded-full"
            disabled={actionBusy() || !frameReady() || excludeActive()}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void runExclude()}
          >
            Exclude
          </Button>
          <Button
            class="w-full justify-center rounded-full"
            disabled={actionBusy() || state.findingFirstUnaligned}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void state.goToFirstUnaligned()}
          >
            Jump
          </Button>
          <Button
            class="w-full justify-center rounded-full"
            disabled={actionBusy() || !state.canGoBack}
            size="sm"
            type="button"
            variant="outline"
            onClick={state.goBack}
          >
            Back
          </Button>
          <Button
            class="w-full justify-center rounded-full"
            disabled={actionBusy() || !frameReady()}
            size="sm"
            type="button"
            onClick={() => void saveAndAdvance()}
          >
            Next
          </Button>
        </RailControlStack>
      </PanelSection>
    </RailSectionStack>
  );
}

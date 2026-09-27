import { AlignGridRail, AlignSelectionRail, AlignToolSection } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack, RailSectionStack } from "@lisca/ui/shell";
import { Show, createEffect, createMemo } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";
import { StudioAlignNav } from "./studio-align-nav";

/** Frame load does not touch the rail — only suppress disabled-state opacity flicker. */
const RAIL_CLASS =
  "[&_button]:transition-none [&_button]:disabled:opacity-100 [&_button]:disabled:saturate-100";

/**
 * Shared Studio Align instrument stack for basic and expert modes.
 * Flattened order (after Instruction): Navigation → Contrast → Tool → Grid → Geometry → Selection → Action.
 * Grid, Geometry, and Selection are expert-only; basic keeps Navigation, Contrast, Tool, and Action.
 */
export function StudioAlignInstrumentStack(props: { expert?: boolean }) {
  const {
    state,
    smartExclude,
    varExclude,
    requestExpertVarExclude,
    excludeActive,
    runExclude,
    saveAndAdvance,
  } = useStudioAlignPage();
  const disabled = () => !state.frame;
  const actionBusy = createMemo(() => state.saving);
  const frameReady = createMemo(() => Boolean(state.frame));

  // Basic mode hides Selection, so drop its Edit / var-exclude preview instead of leaving them live.
  createEffect(() => {
    if (props.expert) return;
    state.setManualExclusionEnabled(false);
    state.cancelVariationExclude();
  });

  return (
    <RailSectionStack class={RAIL_CLASS}>
      <StudioAlignNav />
      <AlignToolSection
        mode={state.toolMode}
        spacingZoomLocked={state.spacingZoomLocked}
        patternZoomLocked={state.patternZoomLocked}
        placement="rail"
        shortcutsEnabled
        onModeChange={state.setToolMode}
        onSpacingZoomLockedChange={state.setSpacingZoomLocked}
        onPatternZoomLockedChange={state.setPatternZoomLocked}
      />
      <Show when={props.expert}>
        <AlignGridRail
          disabled={disabled()}
          grid={state.grid}
          sectionAppearance="rail"
          onGridChange={state.setGrid}
        />
        <AlignSelectionRail
          disabled={disabled()}
          excludedCells={state.currentExcludedCells}
          frame={state.frame}
          grid={state.grid}
          manualExclusionEnabled={state.manualExclusionEnabled}
          sectionAppearance="rail"
          smartExcludeLoading={smartExclude.active()}
          visibleCounts={state.visibleCounts}
          variationExcludeLoading={varExclude.active()}
          variationExcludePreview={state.variationExcludePreview}
          onApplyVariationExclude={() => state.applyVariationExclude()}
          onCancelVariationExclude={() => state.cancelVariationExclude()}
          onExcludedCellsChange={(cells) => state.setExcludedCellsForCurrentPosition(cells)}
          onManualExclusionEnabledChange={(enabled) => state.setManualExclusionEnabled(enabled)}
          onSmartExclude={() => void smartExclude.request()}
          onVariationExclude={() => void requestExpertVarExclude()}
          onVariationExcludeThresholdChange={(threshold) =>
            state.setVariationExcludeThreshold(threshold)
          }
          showVariationExcludeDialog={false}
        />
      </Show>
      <PanelSection appearance="rail" title="Action">
        <RailControlStack>
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
            onClick={() => void saveAndAdvance()}
          >
            Next
          </Button>
        </RailControlStack>
      </PanelSection>
    </RailSectionStack>
  );
}

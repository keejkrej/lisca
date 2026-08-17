import { AlignGridRail, AlignSelectionRail, AlignToolSection } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack, RailSectionStack } from "@lisca/ui/shell";
import { createMemo } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";
import { StudioAlignNav } from "./studio-align-nav";

/** Frame load does not touch the rail — only suppress disabled-state opacity flicker. */
const RAIL_CLASS =
  "[&_button]:transition-none [&_button]:disabled:opacity-100 [&_button]:disabled:saturate-100";

/**
 * Shared Studio Align instrument stack for basic and expert modes.
 * Flattened order (after Instruction): Navigation → Contrast → Tool → Grid → Geometry → Selection → Action.
 */
export function StudioAlignInstrumentStack() {
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

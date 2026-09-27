import { AlignGridRail, AlignSelectionRail, AlignToolSection } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack, RailSectionStack } from "@lisca/ui/shell";
import { Show, createMemo } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";
import { StudioAlignNav } from "./studio-align-nav";

/** Frame load does not touch the rail — only suppress disabled-state opacity flicker. */
const RAIL_CLASS =
  "[&_button]:transition-none [&_button]:disabled:opacity-100 [&_button]:disabled:saturate-100";

/**
 * Shared Studio Align instrument stack for basic and expert modes.
 * Flattened order (after Instruction): Navigation → Contrast → Tool → Grid → Geometry → Selection → Action.
 * Navigation, Contrast, Grid, and Geometry are expert-only; basic keeps Tool, Selection, and Action.
 * Action follows the rail vocabulary: Save → Back → Next → Continue (primary, last).
 */
export function StudioAlignInstrumentStack(props: { expert?: boolean }) {
  const {
    state,
    smartExclude,
    varExclude,
    requestVarExclude,
    applyExcludePreview,
    cancelExcludePreview,
  } = useStudioAlignPage();
  const disabled = () => !state.frame;
  const busy = createMemo(() => state.saving || state.continuing);
  const frameReady = createMemo(() => Boolean(state.frame));

  return (
    <RailSectionStack class={RAIL_CLASS}>
      <Show when={props.expert}>
        <StudioAlignNav />
      </Show>
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
      </Show>
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
        onApplyVariationExclude={applyExcludePreview}
        onCancelVariationExclude={cancelExcludePreview}
        onExcludedCellsChange={(cells) => state.setExcludedCellsForCurrentPosition(cells)}
        onManualExclusionEnabledChange={(enabled) => state.setManualExclusionEnabled(enabled)}
        onSmartExclude={() => void smartExclude.request()}
        onVariationExclude={() => void requestVarExclude()}
        onVariationExcludeThresholdChange={(threshold) =>
          state.setVariationExcludeThreshold(threshold)
        }
        showVariationExcludeDialog={false}
      />
      <PanelSection appearance="rail" title="Action">
        <RailControlStack>
          <Button
            class="w-full justify-center"
            disabled={busy() || !frameReady()}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void state.saveCurrentPosition()}
          >
            {state.saving ? "Saving…" : "Save"}
          </Button>
          <Button
            class="w-full justify-center"
            disabled={busy() || !state.canGoBack}
            size="sm"
            type="button"
            variant="outline"
            onClick={state.goBack}
          >
            Back
          </Button>
          <Button
            class="w-full justify-center"
            disabled={busy() || !state.canGoNext}
            size="sm"
            type="button"
            variant="outline"
            onClick={state.goNext}
          >
            Next
          </Button>
          <Button
            class="w-full justify-center"
            disabled={busy() || !frameReady()}
            size="sm"
            type="button"
            onClick={() => void state.continueAlign()}
          >
            Continue
          </Button>
        </RailControlStack>
      </PanelSection>
    </RailSectionStack>
  );
}

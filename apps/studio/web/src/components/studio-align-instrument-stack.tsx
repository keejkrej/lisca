import { studioAlignPositionNav } from "@lisca/client/studio/source";
import {
  AlignDriftRail,
  AlignGridRail,
  AlignSelectionRail,
  AlignToolSection,
} from "@lisca/instrument";
import { Button } from "@lisca/ui/primitives";
import { PanelSection, RailControlStack, RailSectionStack } from "@lisca/ui/patterns";
import { isAlignDriftTranslationEditable } from "@lisca/utils";
import { Show, createMemo } from "solid-js";

import {
  CommandShortcutHint,
  commandShortcutKeys,
  useStudioCommandShortcut,
} from "../navigation/use-studio-command-shortcut";
import { useStudioAlignPage } from "../state/studio-align-page-context";
import { StudioAlignNav } from "./studio-align-nav";

/**
 * Frame load does not touch the rail — only suppress disabled-state opacity flicker.
 * Back / Next (`data-rail-nav`) keep the dimmed look: their disabled state marks the first/last position.
 * Coming-soon controls (`data-unavailable`) stay dimmed too.
 */
const RAIL_CLASS =
  "[&_button]:transition-none [&_button:not([data-rail-nav]):not([data-unavailable])]:disabled:opacity-100 [&_button:not([data-rail-nav]):not([data-unavailable])]:disabled:saturate-100";

/**
 * Shared Studio Align instrument stack for basic and expert modes.
 * Basic rail: Navigation (Channel, Frame) → Contrast → Grid → Tool → Selection → Action.
 * Expert adds Position and Z to Navigation, then Geometry and Drift before Grid.
 * Action follows the rail vocabulary: Save → Back → Next → Crop (primary, last).
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
  const busy = createMemo(() => state.saving || state.preparingCrop || state.cropping);
  const frameReady = createMemo(() => Boolean(state.frame));
  const positionNav = createMemo(() =>
    studioAlignPositionNav(state.alignPositions, state.selection.pos),
  );
  useStudioCommandShortcut(
    "save",
    () => !busy() && frameReady(),
    () => void state.saveCurrentPosition(),
  );
  useStudioCommandShortcut(
    "back",
    () => !busy() && positionNav().canGoBack,
    () => state.goBack(),
  );
  useStudioCommandShortcut(
    "next",
    () => !busy() && positionNav().canGoNext,
    () => state.goNext(),
  );
  useStudioCommandShortcut(
    "crop",
    () => !busy() && frameReady(),
    () => void state.requestCrop(),
  );

  const gridRail = (railPart: "grid" | "geometry") => (
    <AlignGridRail
      disabled={disabled()}
      grid={state.grid}
      railPart={railPart}
      sectionAppearance="rail"
      shownTranslation={{ tx: state.effectiveGrid.tx, ty: state.effectiveGrid.ty }}
      translationEditable={isAlignDriftTranslationEditable(
        state.drift ?? null,
        state.selection.time,
      )}
      onGridChange={state.setGrid}
      onTranslationDelta={state.adjustTranslation}
    />
  );

  return (
    <RailSectionStack class={RAIL_CLASS}>
      <Show when={!props.expert}>
        <StudioAlignNav standard />
      </Show>
      <Show when={props.expert}>
        <StudioAlignNav />
        {gridRail("geometry")}
        <AlignDriftRail
          assayDefaultTime={state.assayDefaultTime ?? null}
          disabled={disabled()}
          drift={state.drift ?? null}
          frame={state.frame}
          time={state.selection.time}
          times={state.scan?.times}
          onClearDrift={state.clearDrift}
          onClearKeyframe={state.clearKeyframe}
          onDeltaChange={state.setDriftDelta}
          onSetKeyframe={state.setKeyframe}
          onSetReference={state.setReference}
        />
      </Show>
      {gridRail("grid")}
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
      <AlignSelectionRail
        disabled={disabled()}
        excludedPatterns={state.currentExcludedPatterns}
        frame={state.frame}
        grid={state.effectiveGrid}
        manualExclusionEnabled={state.manualExclusionEnabled}
        sectionAppearance="rail"
        smartExcludeLoading={smartExclude.active()}
        visibleCounts={state.visibleCounts}
        variationExcludeLoading={varExclude.active()}
        variationExcludePreview={state.variationExcludePreview}
        onApplyVariationExclude={applyExcludePreview}
        onCancelVariationExclude={cancelExcludePreview}
        onExcludedPatternsChange={(patterns) =>
          state.setExcludedPatternsForCurrentPosition(patterns)
        }
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
            aria-keyshortcuts={commandShortcutKeys("save")}
            class="relative w-full justify-center"
            disabled={busy() || !frameReady()}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void state.saveCurrentPosition()}
          >
            Save
            <CommandShortcutHint command="save" />
          </Button>
          <Button
            aria-keyshortcuts={commandShortcutKeys("back")}
            class="relative w-full justify-center"
            data-rail-nav
            disabled={busy() || !positionNav().canGoBack}
            size="sm"
            type="button"
            variant="outline"
            onClick={state.goBack}
          >
            Back
            <CommandShortcutHint command="back" />
          </Button>
          <Button
            aria-keyshortcuts={commandShortcutKeys("next")}
            class="relative w-full justify-center"
            data-rail-nav
            disabled={busy() || !positionNav().canGoNext}
            size="sm"
            type="button"
            variant="outline"
            onClick={state.goNext}
          >
            Next
            <CommandShortcutHint command="next" />
          </Button>
          <Button
            aria-keyshortcuts={commandShortcutKeys("crop")}
            class="relative w-full justify-center"
            disabled={busy() || !frameReady()}
            size="sm"
            type="button"
            onClick={() => void state.requestCrop()}
          >
            Crop
            <CommandShortcutHint command="crop" />
          </Button>
        </RailControlStack>
      </PanelSection>
    </RailSectionStack>
  );
}

import type { Html } from "@effect/ui/html";
import type {
  AlignGridPatternCoord,
  AlignGridShape,
  AlignGridState,
  ContrastWindow,
  FrameRequest,
} from "@lisca/contracts";
import { studioAlignPositionNav } from "@lisca/client/studio/source";
import {
  AlignDriftRail,
  AlignGridRail,
  AlignSelectionRail,
  AlignToolSection,
} from "@lisca/instrument";
import { PanelSection, RailControlStack, RailSectionStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";
import { isAlignDriftTranslationEditable, type AlignGridToolMode } from "@lisca/utils";

import {
  CommandShortcutHint,
  commandShortcutKeys,
} from "../navigation/use-studio-command-shortcut";
import { selectStudioAlignNav } from "../state/studio-align-page-selectors";
import type { StudioAlignState } from "../state/use-studio-align-state";
import { StudioAlignNav } from "./studio-align-nav";

/**
 * Frame load does not touch the rail — only suppress disabled-state opacity flicker.
 * Back / Next (`data-rail-nav`) keep the dimmed look: their disabled state marks the first/last position.
 * Coming-soon controls (`data-unavailable`) stay dimmed too.
 */
const RAIL_CLASS =
  "[&_button]:transition-none [&_button:not([data-rail-nav]):not([data-unavailable])]:disabled:opacity-100 [&_button:not([data-rail-nav]):not([data-unavailable])]:disabled:saturate-100";

export type StudioAlignInstrumentStackOptions<M> = {
  readonly state: StudioAlignState;
  readonly expert?: boolean | undefined;
  readonly varExcludeActive: boolean;
  readonly onChangePosition: (pos: number) => M;
  readonly onSelectionChange: (patch: Partial<FrameRequest>) => M;
  readonly onContrastChange: (
    contrast: ContrastWindow | null,
    meta?: { readonly lock?: boolean },
  ) => M;
  readonly onContrastLockedChange: (locked: boolean) => M;
  readonly onDetectGrid: (shape?: AlignGridShape) => M;
  readonly onGridChange: (grid: AlignGridState) => M;
  readonly onTranslationDelta: (dx: number, dy: number) => M;
  readonly onClearDrift: M;
  readonly onClearKeyframe: M;
  readonly onDeltaChange: (dx: number, dy: number) => M;
  readonly onSetKeyframe: M;
  readonly onSetReference: M;
  readonly onToolModeChange: (mode: AlignGridToolMode) => M;
  readonly onSpacingZoomLockedChange: (locked: boolean) => M;
  readonly onPatternZoomLockedChange: (locked: boolean) => M;
  readonly onManualExclusionEnabledChange: (enabled: boolean) => M;
  readonly onExcludedPatternsChange: (patterns: AlignGridPatternCoord[]) => M;
  readonly onVariationExclude: M;
  readonly onApplyVariationExclude: M;
  readonly onCancelVariationExclude: M;
  readonly onVariationExcludeThresholdChange: (threshold: number) => M;
  readonly onSave: M;
  readonly onBack: M;
  readonly onNext: M;
  readonly onCrop: M;
};

/**
 * Shared Studio Align instrument stack for basic and expert modes.
 * Basic rail: Navigation (Channel, Frame) → Contrast → Grid → Tool → Selection → Action.
 * Expert adds Position and Z to Navigation, then Geometry and Drift before Grid.
 * Action follows the rail vocabulary: Save → Back → Next → Crop (primary, last).
 */
export function StudioAlignInstrumentStack<M>(
  h: Html.H<M>,
  options: StudioAlignInstrumentStackOptions<M>,
) {
  const { state, expert } = options;
  const disabled = !state.frame;
  const busy = state.saving || state.preparingCrop || state.cropping;
  const frameReady = Boolean(state.frame);
  const positionNav = studioAlignPositionNav(state.alignPositions, state.selection.pos);
  const nav = selectStudioAlignNav(state);

  const gridRail = (railPart: "grid" | "geometry") =>
    AlignGridRail(h, {
      key: `align-grid-${railPart}`,
      detectLowConfidence: state.detectLowConfidence,
      detectReport: state.detectReport,
      detecting: state.detecting,
      disabled: disabled || state.detecting,
      grid: state.grid,
      railPart,
      sectionAppearance: "rail",
      shownTranslation: { tx: state.effectiveGrid.tx, ty: state.effectiveGrid.ty },
      translationEditable: isAlignDriftTranslationEditable(
        state.drift ?? null,
        state.selection.time,
      ),
      onDetectGrid: options.onDetectGrid,
      onGridChange: options.onGridChange,
      onTranslationDelta: options.onTranslationDelta,
    });

  return RailSectionStack(h, { class: RAIL_CLASS }).children(
    ...(!expert
      ? StudioAlignNav(h, {
          nav,
          standard: true,
          onChangePosition: options.onChangePosition,
          onSelectionChange: options.onSelectionChange,
          onContrastChange: options.onContrastChange,
          onContrastLockedChange: options.onContrastLockedChange,
        })
      : [
          ...StudioAlignNav(h, {
            nav,
            onChangePosition: options.onChangePosition,
            onSelectionChange: options.onSelectionChange,
            onContrastChange: options.onContrastChange,
            onContrastLockedChange: options.onContrastLockedChange,
          }),
          gridRail("geometry"),
          AlignDriftRail(h, {
            key: "align-drift-rail",
            assayDefaultTime: state.assayDefaultTime ?? null,
            disabled,
            drift: state.drift ?? null,
            frame: state.frame,
            time: state.selection.time,
            times: state.scan?.times,
            onClearDrift: options.onClearDrift,
            onClearKeyframe: options.onClearKeyframe,
            onDeltaChange: options.onDeltaChange,
            onSetKeyframe: options.onSetKeyframe,
            onSetReference: options.onSetReference,
          }),
        ]),
    gridRail("grid"),
    AlignToolSection(h, {
      key: "align-tool-section",
      mode: state.toolMode,
      spacingZoomLocked: state.spacingZoomLocked,
      patternZoomLocked: state.patternZoomLocked,
      placement: "rail",
      shortcutsEnabled: true,
      onModeChange: options.onToolModeChange,
      onSpacingZoomLockedChange: options.onSpacingZoomLockedChange,
      onPatternZoomLockedChange: options.onPatternZoomLockedChange,
    }),
    AlignSelectionRail(h, {
      key: "align-selection-rail",
      disabled,
      excludedPatterns: state.currentExcludedPatterns,
      frame: state.frame,
      grid: state.effectiveGrid,
      manualExclusionEnabled: state.manualExclusionEnabled,
      sectionAppearance: "rail",
      visibleCounts: state.visibleCounts,
      variationExcludeLoading: options.varExcludeActive,
      variationExcludePreview: state.variationExcludePreview,
      onApplyVariationExclude: options.onApplyVariationExclude,
      onCancelVariationExclude: options.onCancelVariationExclude,
      onExcludedPatternsChange: options.onExcludedPatternsChange,
      onManualExclusionEnabledChange: options.onManualExclusionEnabledChange,
      onVariationExclude: options.onVariationExclude,
      onVariationExcludeThresholdChange: options.onVariationExcludeThresholdChange,
      showVariationExcludeDialog: false,
    }),
    PanelSection(h, {
      key: "align-action-section",
      appearance: "rail",
      title: "Action",
      children: RailControlStack(h).children(
        Button(h, {
          class: "relative w-full justify-center",
          disabled: busy || !frameReady,
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: options.onSave,
        })
          .attr("aria-keyshortcuts", commandShortcutKeys("save"))
          .children("Save", CommandShortcutHint(h, { key: "align-save-hint", command: "save" })),
        Button(h, {
          class: "relative w-full justify-center",
          disabled: busy || !positionNav.canGoBack,
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: options.onBack,
        })
          .attr("aria-keyshortcuts", commandShortcutKeys("back"))
          .attr("data-rail-nav", "")
          .children("Back", CommandShortcutHint(h, { key: "align-back-hint", command: "back" })),
        Button(h, {
          class: "relative w-full justify-center",
          disabled: busy || !positionNav.canGoNext,
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: options.onNext,
        })
          .attr("aria-keyshortcuts", commandShortcutKeys("next"))
          .attr("data-rail-nav", "")
          .children("Next", CommandShortcutHint(h, { key: "align-next-hint", command: "next" })),
        Button(h, {
          class: "relative w-full justify-center",
          disabled: busy || !frameReady,
          size: "sm",
          type: "button",
          onPress: options.onCrop,
        })
          .attr("aria-keyshortcuts", commandShortcutKeys("crop"))
          .children("Crop", CommandShortcutHint(h, { key: "align-crop-hint", command: "crop" })),
      ),
    }),
  );
}

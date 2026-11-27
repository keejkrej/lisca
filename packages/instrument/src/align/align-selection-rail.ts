import type { Html } from "@effect/ui/html";
import type { AlignGridPatternCoord, AlignGridState } from "@lisca/contracts";
import { Button } from "@lisca/ui/button";
import { PanelSection, RailActionPair } from "@lisca/ui/patterns";
import {
  collectAlignGridEdgePatterns,
  enumerateVisibleAlignGridPatterns,
  mergeExcludedAlignGridPatterns,
  type AlignGridFrameBounds,
} from "@lisca/utils";

import { AlignEditToggle } from "./align-edit-toggle";
import { AlignSelectionCounts } from "./align-selection-counts";
import {
  VariationExcludeDialog,
  type VariationExcludePreviewState,
} from "./variation-exclude-dialog";

export type AlignSelectionRailOptions<M> = {
  readonly key?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly frame: AlignGridFrameBounds | null;
  readonly grid: AlignGridState;
  readonly excludedPatterns: readonly AlignGridPatternCoord[];
  readonly visibleCounts: {
    readonly included: number;
    readonly excluded: number;
  };
  readonly manualExclusionEnabled: boolean;
  readonly onManualExclusionEnabledChange: (enabled: boolean) => M | undefined;
  readonly onExcludedPatternsChange: (patterns: AlignGridPatternCoord[]) => M | undefined;
  readonly variationExcludePreview: VariationExcludePreviewState;
  readonly variationExcludeLoading?: boolean | undefined;
  readonly onVariationExclude: M;
  readonly onApplyVariationExclude: M;
  readonly onCancelVariationExclude: M;
  readonly onVariationExcludeThresholdChange: (threshold: number) => M | undefined;
  readonly sectionClassName?: string | undefined;
  readonly sectionContentClassName?: string | undefined;
  readonly sectionAppearance?: "framed" | "rail" | undefined;
  /** When false, the caller mounts `VariationExcludeDialog` elsewhere (e.g. dock-driven exclude). */
  readonly showVariationExcludeDialog?: boolean | undefined;
};

export type AlignSelectionRailProps<M = never> = AlignSelectionRailOptions<M>;

export function AlignSelectionRail<M>(h: Html.H<M>, options: AlignSelectionRailOptions<M>) {
  const disabled = options.disabled ?? false;
  const variationExcludeLoading = options.variationExcludeLoading ?? false;
  const showVariationExcludeDialog = options.showVariationExcludeDialog ?? true;

  const visiblePatterns: AlignGridPatternCoord[] = options.frame
    ? enumerateVisibleAlignGridPatterns(options.frame, options.grid).map(({ i, j }) => ({
        i,
        j,
      }))
    : [];
  const hasVisiblePatterns = visiblePatterns.length > 0;
  const hasExcludedPatterns = options.excludedPatterns.length > 0;

  const editControl = AlignEditToggle(h, {
    disabled,
    enabled: options.manualExclusionEnabled,
    onEnabledChange: options.onManualExclusionEnabledChange,
  });

  const resetPress = options.onExcludedPatternsChange([]);
  const resetControl = Button(h, {
    class: "w-full justify-center text-xs",
    disabled: disabled || !hasExcludedPatterns,
    size: "sm",
    type: "button",
    variant: "outline",
    ...(resetPress !== undefined ? { onPress: resetPress } : {}),
  }).children("Reset");

  const excludeAllPress = options.onExcludedPatternsChange(visiblePatterns);
  const excludeAllControl = Button(h, {
    class: "w-full justify-center text-xs",
    disabled: disabled || !hasVisiblePatterns,
    size: "sm",
    type: "button",
    variant: "outline",
    ...(excludeAllPress !== undefined ? { onPress: excludeAllPress } : {}),
  }).children("Exclude all");

  const edgeExcludePress = options.frame
    ? options.onExcludedPatternsChange(
        mergeExcludedAlignGridPatterns(
          [...options.excludedPatterns],
          collectAlignGridEdgePatterns(options.frame, options.grid),
        ),
      )
    : undefined;
  const edgeExcludeControl = Button(h, {
    class: "w-full justify-center text-xs",
    disabled: disabled || !hasVisiblePatterns,
    size: "sm",
    type: "button",
    variant: "outline",
    ...(edgeExcludePress !== undefined ? { onPress: edgeExcludePress } : {}),
  }).children("Edge exclude");

  const variationExcludeControl = Button(h, {
    class: "w-full justify-center text-xs",
    disabled: disabled || !hasVisiblePatterns || variationExcludeLoading,
    size: "sm",
    type: "button",
    variant: "outline",
    onPress: options.onVariationExclude,
  }).children("Log-std exclude");

  const section = PanelSection(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    appearance: options.sectionAppearance,
    class: options.sectionClassName,
    contentClassName: options.sectionContentClassName,
    title: "Selection",
    children:
      options.sectionAppearance === "rail"
        ? h.div
            .class("flex w-full min-w-0 flex-col gap-2")
            .children(
              RailActionPair(h, { label: "Selection editing" }).children(editControl, resetControl),
              RailActionPair(h, { label: "Bulk exclusion" }).children(
                excludeAllControl,
                edgeExcludeControl,
              ),
              variationExcludeControl,
            )
        : [
            AlignSelectionCounts(h, {
              excluded: options.visibleCounts.excluded,
              included: options.visibleCounts.included,
            }),
            h.div.class("grid w-full grid-cols-2 gap-2").children(editControl, resetControl),
            h.div.class("grid grid-cols-2 gap-2").children(excludeAllControl, edgeExcludeControl),
            variationExcludeControl,
          ],
  });

  if (!showVariationExcludeDialog || options.variationExcludePreview === null) {
    return section;
  }

  return h.div.class("contents").children(
    section,
    VariationExcludeDialog(h, {
      key: options.key ? `${options.key}-variation-dialog` : "variation-dialog",
      state: options.variationExcludePreview,
      onApply: options.onApplyVariationExclude,
      onCancel: options.onCancelVariationExclude,
      onThresholdChange: options.onVariationExcludeThresholdChange,
    }),
  );
}

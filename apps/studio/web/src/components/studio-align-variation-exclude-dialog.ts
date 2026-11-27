import type { Html } from "@effect/ui/html";
import { VariationExcludeDialog, type VariationExcludePreviewState } from "@lisca/instrument";

export type StudioAlignVariationExcludeDialogOptions<M> = {
  readonly state: VariationExcludePreviewState;
  readonly onApply: M;
  readonly onCancel: M;
  readonly onThresholdChange: (threshold: number) => M | undefined;
};

export function StudioAlignVariationExcludeDialog<M>(
  h: Html.H<M>,
  options: StudioAlignVariationExcludeDialogOptions<M>,
) {
  return VariationExcludeDialog(h, {
    key: "studio-align-variation-exclude",
    state: options.state,
    onApply: options.onApply,
    onCancel: options.onCancel,
    onThresholdChange: options.onThresholdChange,
  });
}

import { createBrowserSmartExcludeSetup } from "@lisca/smart/exclude/browser";
import { useSmartExclude } from "@lisca/smart/exclude";
import { AlignSelectionRail, SmartExcludeModelDialog } from "@lisca/ui/features";
import type { DemoAlignState } from "@lisca/web-demo";
import type { Accessor } from "solid-js";

const browserSmartExclude = createBrowserSmartExcludeSetup();

export function DemoAlignSelectionControls(props: { state: Accessor<DemoAlignState> }) {
  const disabled = () => !props.state().frame;
  const smartExclude = useSmartExclude({
    provider: browserSmartExclude.provider,
    model: browserSmartExclude.model,
    frame: () => props.state().frame,
    grid: () => props.state().grid,
    currentExcludedCells: () => props.state().excludedCells,
    enabled: () => !disabled(),
    onComplete: props.state().applySmartExclusion,
    onError: props.state().reportError,
  });

  return (
    <>
      <SmartExcludeModelDialog
        busy={smartExclude.busy()}
        state={smartExclude.downloadState()}
        onCancel={smartExclude.cancelDownload}
        onConfirm={() => void smartExclude.confirmDownload()}
      />
      <AlignSelectionRail
        disabled={disabled()}
        excludedCells={props.state().excludedCells}
        frame={props.state().frame}
        grid={props.state().grid}
        manualExclusionEnabled={props.state().manualExclusionEnabled}
        sectionAppearance="rail"
        smartExcludeLoading={smartExclude.active()}
        visibleCounts={props.state().visibleCounts}
        variationExcludeLoading={props.state().variationExcludeLoading}
        variationExcludePreview={props.state().variationExcludePreview}
        onApplyVariationExclude={props.state().applyVariationExclude}
        onSmartExclude={() => void smartExclude.request()}
        onCancelVariationExclude={props.state().cancelVariationExclude}
        onExcludedCellsChange={props.state().setExcludedCells}
        onManualExclusionEnabledChange={props.state().setManualExclusionEnabled}
        onVariationExclude={() => void props.state().variationExclude()}
        onVariationExcludeThresholdChange={props.state().setVariationExcludeThreshold}
      />
    </>
  );
}

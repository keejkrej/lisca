import { PanelSection } from "@lisca/ui/shell";

import { useStudioStore } from "../state/studio-store";
import { useStudioResultState } from "../state/use-studio-result-state";

export function StudioResultExpertRight() {
  const resultState = useStudioResultState();
  const assayId = useStudioStore((state) => state.assayId);

  const fileCount = () => resultState.analysisResultFiles.length;

  return (
    <PanelSection appearance="rail" title="Analysis">
      <div class="flex flex-col gap-1 text-[13px] leading-[18px]">
        <div class="flex items-center justify-between gap-3">
          <span class="text-muted-foreground">Assay</span>
          <span class="min-w-0 truncate font-medium">{assayId() ?? "—"}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-muted-foreground">Files</span>
          <span class="font-medium tabular-nums">{fileCount()}</span>
        </div>
      </div>
    </PanelSection>
  );
}

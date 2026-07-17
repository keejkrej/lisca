import { PanelSection, SidebarStack } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioStore } from "../state/studio-store";
import { useStudioResultState } from "../state/use-studio-result-state";

export function StudioResultExpertRight() {
  const resultState = useStudioResultState();
  const assayId = useStudioStore((state) => state.assayId);

  const analysisResultFiles = () => resultState.analysisResultFiles;
  const hasAnyResultFiles = () => analysisResultFiles().length > 0;

  const fileCount = () => analysisResultFiles().length;

  return (
    <SidebarStack class="p-0">
      <PanelSection title="Analysis">
        <div class="flex flex-col gap-1 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Assay</span>
            <span class="font-medium">{assayId() ?? "—"}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Result files</span>
            <span class="font-medium tabular-nums">{fileCount()}</span>
          </div>
        </div>
      </PanelSection>
      <Show when={!hasAnyResultFiles()}>
        <PanelSection title="Results">
          <p class="text-muted-foreground text-sm">Run analysis to see results here.</p>
        </PanelSection>
      </Show>
    </SidebarStack>
  );
}

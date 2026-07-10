import { Button } from "@lisca/ui/components";
import { SidebarSection, SidebarStack } from "@lisca/ui/shell";
import { Show } from "solid-js";
import { filterResultFilesBySection } from "@lisca/analysis";

import { useStudioStore } from "../state/studio-store";
import { useStudioResultState } from "../state/use-studio-result-state";
import type { ResultPlotSection } from "@lisca/analysis";

export function StudioResultExpertRight() {
  const resultState = useStudioResultState();
  const assayId = useStudioStore((state) => state.assayId);

  const analysisResultFiles = () => resultState.analysisResultFiles;
  const hasTimeseriesFiles = () => filterResultFilesBySection(analysisResultFiles(), "timeseries").length > 0;
  const hasParameterFiles = () => filterResultFilesBySection(analysisResultFiles(), "parameters").length > 0;
  const hasAnyResultFiles = () => analysisResultFiles().length > 0;

  const fileCount = () => analysisResultFiles().length;

  return (
    <SidebarStack>
      <SidebarSection title="Analysis">
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
      </SidebarSection>
      <Show when={hasAnyResultFiles()}>
        <SidebarSection title="Sections">
          <div class="flex flex-col gap-2">
            <SectionButton
              label="Timeseries"
              disabled={!hasTimeseriesFiles()}
              onClick={() => switchSection("timeseries")}
            />
            <SectionButton
              label="Parameters"
              disabled={!hasParameterFiles()}
              onClick={() => switchSection("parameters")}
            />
          </div>
        </SidebarSection>
      </Show>
      <Show when={!hasAnyResultFiles()}>
        <SidebarSection title="Results">
          <p class="text-muted-foreground text-sm">
            Run analysis to see results here.
          </p>
        </SidebarSection>
      </Show>
    </SidebarStack>
  );

  function switchSection(section: ResultPlotSection) {
    const event = new CustomEvent("studio-result-section", { detail: section });
    window.dispatchEvent(event);
  }
}

function SectionButton(props: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <Button
      class="w-full justify-center text-xs"
      disabled={props.disabled}
      size="sm"
      type="button"
      variant="outline"
      onClick={props.onClick}
    >
      {props.label}
    </Button>
  );
}

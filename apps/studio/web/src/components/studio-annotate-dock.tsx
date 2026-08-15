import { Button } from "@lisca/ui/components";
import { AnnotationToolGrid, buildAnnotationToolActions } from "@lisca/ui/features";
import { DockSection, DockStrip } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAnnotateDock } from "../state/studio-annotate-page-selectors";

export function StudioAnnotateDock() {
  const dock = useStudioAnnotateDock();
  const canEditTools = () => dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = () => buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools());
  const disableShuffle = () => dock.scanLoading || dock.scan === null || dock.workspaceMissing;
  const disableContinue = () =>
    dock.frameLoading || !dock.request || dock.analysisBusy || dock.workspaceMissing;

  return (
    <DockStrip>
      <Show when={dock.mode === "segmentation"}>
        <DockSection title="Tool">
          <AnnotationToolGrid
            canEditTools={canEditTools()}
            shortcutsEnabled={dock.shortcutsEnabled}
            toolActions={toolActions()}
          />
        </DockSection>
      </Show>
      <DockSection title="Save">
        <Button
          class="w-full justify-center"
          disabled={!dock.canSave}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void dock.handleSave()}
        >
          {dock.saving ? "Saving…" : "Save"}
        </Button>
      </DockSection>
      <DockSection title="Action">
        <div class="flex flex-col gap-2">
          <Button
            class="w-full justify-center"
            disabled={disableShuffle()}
            size="sm"
            type="button"
            variant="outline"
            onClick={dock.shuffleSelection}
          >
            Shuffle
          </Button>
          <Button
            class="w-full justify-center"
            size="sm"
            type="button"
            onClick={dock.requestContinueToAnalysis}
            disabled={disableContinue()}
          >
            Continue to analysis
          </Button>
        </div>
      </DockSection>
    </DockStrip>
  );
}

import { Button } from "@lisca/ui/components";
import { AnnotationToolGrid, buildAnnotationToolActions } from "@lisca/ui/features";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";
import { Show } from "solid-js";

import {
  useStudioAnnotateCanvas,
  useStudioAnnotateDock,
} from "../state/studio-annotate-page-selectors";

export function StudioAnnotateControls(props: { showTools?: boolean; showShuffle?: boolean }) {
  const dock = useStudioAnnotateDock();
  const canvas = useStudioAnnotateCanvas();
  const canEditTools = () => dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = () =>
    buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools(), {
      viewable: Boolean(canvas.frame),
    });
  const disableShuffle = () => dock.scanLoading || dock.scan === null || dock.workspaceMissing;
  const disableContinue = () =>
    dock.frameLoading || !dock.request || dock.analysisBusy || dock.workspaceMissing;

  return (
    <>
      <Show when={(props.showTools ?? true) && dock.mode === "segmentation"}>
        <PanelSection appearance="rail" title="Tool">
          <AnnotationToolGrid
            canEditTools={canEditTools()}
            layout="rail"
            shortcutsEnabled={dock.shortcutsEnabled}
            toolActions={toolActions()}
          />
        </PanelSection>
      </Show>
      <PanelSection appearance="rail" title="Action">
        <RailControlStack>
          <Button
            class="w-full justify-center rounded-full"
            disabled={!dock.canSave}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void dock.handleSave()}
          >
            {dock.saving ? "Saving…" : "Save"}
          </Button>
          <Button
            class="w-full justify-center rounded-full"
            disabled={!dock.canGoToNextSite}
            size="sm"
            type="button"
            variant="outline"
            onClick={dock.goToNextSite}
          >
            Next site
          </Button>
          <Show when={props.showShuffle ?? true}>
            <Button
              class="w-full justify-center rounded-full"
              disabled={disableShuffle()}
              size="sm"
              type="button"
              variant="outline"
              onClick={dock.shuffleSelection}
            >
              Shuffle
            </Button>
          </Show>
          <Button
            class="w-full justify-center rounded-full"
            size="sm"
            type="button"
            onClick={dock.requestContinueToAnalysis}
            disabled={disableContinue()}
          >
            Continue to analysis
          </Button>
        </RailControlStack>
      </PanelSection>
    </>
  );
}

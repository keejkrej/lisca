import { Button } from "@lisca/ui/components";
import { AnnotationToolGrid, buildAnnotationToolActions } from "@lisca/ui/features";
import { DockSection, DockStrip, ReadonlyPathField } from "@lisca/ui/shell";
import { annotationOutputPaths } from "@lisca/client/use-annotate-state-core";
import { For, Show } from "solid-js";

import { useStudioAnnotateDock } from "../state/studio-annotate-page-selectors";

export function StudioAnnotateDock() {
  const dock = useStudioAnnotateDock();
  const paths = () => annotationOutputPaths(dock.request);
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
        <div class="flex w-full flex-col gap-2">
          <Show
            when={paths().length > 1}
            fallback={
              <For each={paths()}>
                {(path) => <ReadonlyPathField aria-label={`Output path ${path}`} value={path} />}
              </For>
            }
          >
            <div class="grid w-full grid-cols-2 gap-2">
              <For each={paths()}>
                {(path) => (
                  <div class="min-w-0">
                    <ReadonlyPathField aria-label={`Output path ${path}`} value={path} />
                  </div>
                )}
              </For>
            </div>
          </Show>
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
        </div>
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
            disabled={disableContinue()}
            size="sm"
            type="button"
            variant="outline"
            onClick={dock.requestContinueToAnalysis}
          >
            Continue to analysis
          </Button>
        </div>
      </DockSection>
    </DockStrip>
  );
}

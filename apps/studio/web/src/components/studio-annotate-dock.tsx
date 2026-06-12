import { Button } from "@lisca/ui/components";
import {
  AnnotationToolGrid,
  buildAnnotationToolActions,
} from "@lisca/ui/features";
import {
  DockSection,
  DockStrip,
  ReadonlyPathField,
} from "@lisca/ui/shell";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { annotationOutputPaths } from "../utils/annotation-output";

export function StudioAnnotateDock() {
  const { state } = useStudioAnnotatePage();
  const paths = annotationOutputPaths(state.request, state.mode);
  const shortcutsEnabled =
    state.mode === "segmentation" &&
    state.canEditSegmentation &&
    !state.labelDialogOpen;
  const canEditTools = state.mode === "segmentation" && shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);
  const analysisBusy = Boolean(
    state.analysisProgress &&
      (state.analysisProgress.status === "queued" || state.analysisProgress.status === "running"),
  );
  const disableShuffle = state.scanLoading || state.scan === null || state.workspaceMissing;
  const disableContinue = state.frameLoading || !state.request || analysisBusy || state.workspaceMissing;

  return (
    <DockStrip>
      <DockSection title="Tool">
        {state.mode === "segmentation" ? (
          <AnnotationToolGrid canEditTools={canEditTools} toolActions={toolActions} />
        ) : (
          <div className="flex min-h-[4.5rem] items-center justify-center text-muted-foreground text-xs">
            Classification
          </div>
        )}
      </DockSection>
      <DockSection title="Save">
        <div className="flex w-full flex-col gap-2">
          {paths.length > 1 ? (
            <div className="grid w-full grid-cols-2 gap-2">
              {paths.map((path) => (
                <div key={path} className="min-w-0">
                  <ReadonlyPathField aria-label={`Output path ${path}`} value={path} />
                </div>
              ))}
            </div>
          ) : (
            paths.map((path) => (
              <ReadonlyPathField key={path} aria-label={`Output path ${path}`} value={path} />
            ))
          )}
          <Button
            className="w-full justify-center"
            disabled={!state.canSave}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => void state.handleSave()}
          >
            {state.saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DockSection>
      <DockSection fit="panel" title="Workflow">
        <p className="line-clamp-4 text-center text-sm leading-snug">
          Annotate ROIs before running analysis. Saved annotations are stored under annotations/.
        </p>
      </DockSection>
      <DockSection title="Action">
        <div className="flex flex-col gap-2">
          <Button
            className="w-full justify-center"
            disabled={disableShuffle}
            size="sm"
            type="button"
            variant="outline"
            onClick={state.shuffleSelection}
          >
            Shuffle
          </Button>
          <Button
            className="w-full justify-center"
            disabled={disableContinue}
            size="sm"
            type="button"
            variant="outline"
            onClick={state.requestContinueToAnalysis}
          >
            Continue to analysis
          </Button>
        </div>
      </DockSection>
    </DockStrip>
  );
}

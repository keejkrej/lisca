import { Button } from "@lisca/ui/components";
import { AnnotationToolGrid, buildAnnotationToolActions } from "@lisca/ui/features";
import { DockSection, DockStrip, ReadonlyPathField } from "@lisca/ui/shell";

import { useStudioAnnotateDock } from "../state/studio-annotate-page-selectors";
import { annotationOutputPaths } from "../utils/annotation-output";

export function StudioAnnotateDock() {
  const dock = useStudioAnnotateDock();
  const paths = annotationOutputPaths(dock.request, dock.mode);
  const canEditTools = dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools);
  const disableShuffle = dock.scanLoading || dock.scan === null || dock.workspaceMissing;
  const disableContinue =
    dock.frameLoading || !dock.request || dock.analysisBusy || dock.workspaceMissing;

  return (
    <DockStrip>
      {dock.mode === "segmentation" ? (
        <DockSection title="Tool">
          <AnnotationToolGrid
            canEditTools={canEditTools}
            shortcutsEnabled={dock.shortcutsEnabled}
            toolActions={toolActions}
          />
        </DockSection>
      ) : null}
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
        <div className="flex flex-col gap-2">
          <Button
            className="w-full justify-center"
            disabled={disableShuffle}
            size="sm"
            type="button"
            variant="outline"
            onClick={dock.shuffleSelection}
          >
            Shuffle
          </Button>
          <Button
            className="w-full justify-center"
            disabled={disableContinue}
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

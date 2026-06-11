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
import { useAnnotatePage } from "../state/annotate-page-context";
import { annotationOutputPaths } from "../utils/annotation-output";

export function AnnotatorDock() {
  const { state } = useAnnotatePage();
  const paths = annotationOutputPaths(state.request, state.mode);
  const shortcutsEnabled =
    state.mode === "segmentation" &&
    state.canEditSegmentation &&
    !state.labelDialogOpen &&
    !state.filePickerOpen;
  const canEditTools = state.mode === "segmentation" && shortcutsEnabled;
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);

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
          {paths.length > 1 ? (
            <div className="grid w-full grid-cols-2 gap-2">
              <div className="col-span-2 min-w-0">
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
            </div>
          ) : (
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
          )}
        </div>
      </DockSection>
    </DockStrip>
  );
}

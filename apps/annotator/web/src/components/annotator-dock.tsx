import { Button } from "@lisca/ui/components";
import type { AnnotationTool } from "@lisca/ui/features";
import {
  DockSection,
  DockStrip,
  ReadonlyPathField,
  dockToolLabel,
  dockToolShortcuts,
  useKeyboardShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";
import { useAnnotatePage } from "../state/annotate-page-context";
import { annotationOutputPaths } from "../utils/annotation-output";

const annotationToolDefinitions: { id: AnnotationTool; label: string }[] = [
  { id: "brush", label: "Brush" },
  { id: "brush-erase", label: "Brush Erase" },
  { id: "lasso", label: "Lasso" },
  { id: "lasso-erase", label: "Lasso Erase" },
];

function buildAnnotationToolActions(
  tool: AnnotationTool,
  onToolChange: (tool: AnnotationTool) => void,
  disabled: boolean,
): DockToolAction[] {
  return annotationToolDefinitions.map(({ id, label }) => ({
    id,
    label,
    disabled,
    active: tool === id,
    onSelect: () => onToolChange(id),
  }));
}

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
  useKeyboardShortcuts(dockToolShortcuts(toolActions), { enabled: canEditTools });

  const toolButtons = toolActions.map((action, index) => {
    const label = dockToolLabel(action.label, index);
    return (
      <Button
        key={action.id}
        className="w-full justify-center"
        disabled={action.disabled}
        size="sm"
        type="button"
        variant={action.active ? "default" : "outline"}
        onClick={action.onSelect}
      >
        {label}
      </Button>
    );
  });

  return (
    <DockStrip>
      <DockSection title="Tool">
        {state.mode === "segmentation" ? (
          <div className="flex w-full flex-col gap-2">
            <div className="grid w-full grid-cols-2 gap-2">
              <div className="min-w-0">{toolButtons[0]}</div>
              <div className="min-w-0">{toolButtons[1]}</div>
            </div>
            <div className="grid w-full grid-cols-2 gap-2">
              <div className="min-w-0">{toolButtons[2]}</div>
              <div className="min-w-0">{toolButtons[3]}</div>
            </div>
          </div>
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

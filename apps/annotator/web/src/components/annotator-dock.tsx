import { Button, cn } from "@lisca/ui/components";
import type { AnnotationTool } from "@lisca/ui/features";
import {
  dockLayoutClass,
  dockSectionClass,
  DockToolGrid,
  ReadonlyPathField,
  Section,
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

function SegmentationDock(props: {
  tool: AnnotationTool;
  setTool: (tool: AnnotationTool) => void;
  canEditTools: boolean;
  toolActions: DockToolAction[];
}) {
  return (
    <DockToolGrid
      actions={props.toolActions}
      className="grid flex-1 grid-cols-2 gap-2"
      enabled={props.canEditTools}
      renderAction={(action, _index, label) => (
        <Button
          className="h-full justify-center"
          disabled={action.disabled}
          type="button"
          variant={action.active ? "default" : "outline"}
          onClick={action.onSelect}
        >
          {label}
        </Button>
      )}
    />
  );
}

function ClassificationDock() {
  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
      Classification
    </div>
  );
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

  return (
    <div className={dockLayoutClass}>
      <Section
        className={dockSectionClass}
        contentClassName="flex min-h-0 flex-1 flex-col gap-2"
        title="Tool"
      >
        {state.mode === "segmentation" ? (
          <SegmentationDock
            canEditTools={canEditTools}
            setTool={state.setTool}
            tool={state.tool}
            toolActions={toolActions}
          />
        ) : (
          <ClassificationDock />
        )}
      </Section>
      <Section
        className={dockSectionClass}
        contentClassName="flex min-h-0 flex-col gap-2"
        title="Save"
      >
        <div className={cn("grid min-w-0 gap-2", paths.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {paths.map((path) => (
            <ReadonlyPathField key={path} aria-label={`Output path ${path}`} value={path} />
          ))}
        </div>
        <Button
          className="w-full max-w-48 justify-center"
          disabled={!state.canSave}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.handleSave()}
        >
          {state.saving ? "Saving…" : "Save"}
        </Button>
      </Section>
    </div>
  );
}

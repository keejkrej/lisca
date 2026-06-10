import { Button, cn } from "@lisca/ui/components";
import type { AnnotationTool } from "@lisca/ui/features";
import {
  DockSection,
  DockStrip,
  dockToolLabel,
  ReadonlyPathField,
  useDockToolShortcuts,
  type DockGridLayout,
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

function SegmentationToolButtons(props: { canEditTools: boolean; toolActions: DockToolAction[] }) {
  useDockToolShortcuts(props.toolActions, { enabled: props.canEditTools });

  return props.toolActions.map((action, index) => {
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
  const saveLayout: DockGridLayout = paths.length > 1 ? "2x2" : "2x1";

  return (
    <DockStrip panels={2}>
      <DockSection layout="2x2" title="Tool">
        {state.mode === "segmentation" ? (
          <SegmentationToolButtons canEditTools={canEditTools} toolActions={toolActions} />
        ) : (
          <div className="col-span-2 row-span-2 flex items-center justify-center text-muted-foreground text-xs">
            Classification
          </div>
        )}
      </DockSection>
      <DockSection layout={saveLayout} title="Save">
        {paths.map((path) => (
          <ReadonlyPathField key={path} aria-label={`Output path ${path}`} value={path} />
        ))}
        <Button
          className={cn("w-full justify-center", paths.length > 1 && "col-span-2")}
          disabled={!state.canSave}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.handleSave()}
        >
          {state.saving ? "Saving…" : "Save"}
        </Button>
      </DockSection>
    </DockStrip>
  );
}

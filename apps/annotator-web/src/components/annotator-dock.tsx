import type { AnnotationMode, RoiFrameRequest } from "@lisca/contracts";
import {
  Button,
  DockToolGrid,
  ReadonlyPathField,
  Section,
  cn,
  type AnnotationTool,
  type DockToolAction,
} from "@lisca/ui";
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

export function AnnotatorDock(props: {
  mode: AnnotationMode;
  tool: AnnotationTool;
  request: RoiFrameRequest | null;
  canSave: boolean;
  saving: boolean;
  shortcutsEnabled?: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onSave: () => void;
}) {
  const paths = annotationOutputPaths(props.request, props.mode);
  const canEditTools = props.mode === "segmentation" && props.shortcutsEnabled !== false;
  const toolActions = buildAnnotationToolActions(
    props.tool,
    props.onToolChange,
    !canEditTools,
  );

  return (
    <div className="flex h-full min-h-0 w-full gap-3 p-3">
      <Section
        className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
        contentClassName="flex min-h-0 flex-1 flex-col gap-2"
        title="Tool"
      >
        {props.mode === "segmentation" ? (
          <DockToolGrid
            actions={toolActions}
            className="grid flex-1 grid-cols-2 gap-2"
            enabled={canEditTools}
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
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
            Classification
          </div>
        )}
      </Section>
      <Section
        className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
        contentClassName="flex min-h-0 flex-col gap-2"
        title="Save"
      >
        <div className={cn("grid min-w-0 gap-2", paths.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {paths.map((path) => (
            <ReadonlyPathField key={path} aria-label={`Output path ${path}`} value={path} />
          ))}
        </div>
        <Button
          className="w-full justify-center"
          disabled={!props.canSave}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onSave}
        >
          {props.saving ? "Saving" : "Save"}
        </Button>
      </Section>
    </div>
  );
}

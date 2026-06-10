import { Button } from "@lisca/ui/components";
import type { AnnotationTool } from "@lisca/ui/features";
import {
  DockGrid,
  DockSection,
  dockToolLabel,
  useDockToolShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";

import type { DemoAnnotatorState } from "../state/use-demo-annotator-state";

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

export function DemoAnnotatorToolSection({
  state,
  bare,
}: {
  state: DemoAnnotatorState;
  bare?: boolean;
}) {
  const canEditTools = state.mode === "segmentation";
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);

  const tools =
    state.mode === "segmentation" ? (
      <SegmentationToolButtons canEditTools={canEditTools} toolActions={toolActions} />
    ) : (
      <div className="col-span-2 row-span-2 flex items-center justify-center text-muted-foreground text-xs">
        Classification
      </div>
    );

  if (bare) {
    return (
      <div className="shrink-0 border-t border-border px-3 py-2">
        <DockGrid
          aria-label="Annotation tool"
          className="mx-auto max-w-md"
          layout="2x2"
          role="toolbar"
        >
          {tools}
        </DockGrid>
      </div>
    );
  }

  return (
    <DockSection layout="2x2" title="Tool">
      {tools}
    </DockSection>
  );
}

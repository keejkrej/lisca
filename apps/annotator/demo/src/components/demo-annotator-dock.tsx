import { Button } from "@lisca/ui/components";
import type { AnnotationTool } from "@lisca/ui/features";
import {
  DockSection,
  DockStrip,
  dockToolLabel,
  ReadonlyPathField,
  useDockToolShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";
import { stemName } from "@lisca/browser-frame";

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

export function DemoAnnotatorDock({ state }: { state: DemoAnnotatorState }) {
  const stem = state.fileName ? stemName(state.fileName) : "image";
  const canEditTools = state.mode === "segmentation";
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);

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
      <DockSection layout="2x2" title="Save">
        <ReadonlyPathField aria-label="Output annotation JSON" value={`${stem}.annotation.json`} />
        <ReadonlyPathField aria-label="Output mask PNG" value={`${stem}.mask.png`} />
        <Button
          className="col-span-2 w-full justify-center"
          disabled={!state.canSave}
          loading={state.saving}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.saveCurrent()}
        >
          Download
        </Button>
      </DockSection>
    </DockStrip>
  );
}

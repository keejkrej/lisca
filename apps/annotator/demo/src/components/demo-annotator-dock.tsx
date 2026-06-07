import {
  Button,
  DockToolGrid,
  ReadonlyPathField,
  Section,
  type AnnotationTool,
  type DockToolAction,
} from "@lisca/ui";
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

export function DemoAnnotatorDock({ state }: { state: DemoAnnotatorState }) {
  const stem = state.fileName ? stemName(state.fileName) : "image";
  const canEditTools = state.mode === "segmentation";
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);

  return (
    <div className="flex h-full min-h-0 w-full gap-3 p-3">
      <Section
        className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
        contentClassName="flex min-h-0 flex-1 flex-col gap-2"
        title="Tool"
      >
        {state.mode === "segmentation" ? (
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
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <ReadonlyPathField aria-label="Output annotation JSON" value={`${stem}.annotation.json`} />
          <ReadonlyPathField aria-label="Output mask PNG" value={`${stem}.mask.png`} />
        </div>
        <Button
          className="w-full justify-center"
          disabled={!state.canSave}
          loading={state.saving}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.saveCurrent()}
        >
          Download
        </Button>
      </Section>
    </div>
  );
}

import { Button } from "@lisca/ui/components";
import type { AnnotationTool } from "@lisca/ui/features";
import {
  DockSection,
  dockToolLabel,
  dockToolShortcuts,
  useKeyboardShortcuts,
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

function DemoAnnotatorToolToolbar(props: {
  canEditTools: boolean;
  toolActions: DockToolAction[];
  className?: string;
  shortcutsEnabled?: boolean;
}) {
  useKeyboardShortcuts(dockToolShortcuts(props.toolActions), {
    enabled: props.canEditTools && (props.shortcutsEnabled ?? true),
  });

  const showShortcutLabels = props.shortcutsEnabled ?? true;

  const buttons = props.toolActions.map((action, index) => {
    const label = showShortcutLabels ? dockToolLabel(action.label, index) : action.label;
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
    <div
      aria-label="Annotation tool"
      className={props.className ?? "flex w-full flex-col gap-2"}
      role="toolbar"
    >
      <div className="grid w-full grid-cols-2 gap-2">
        <div className="min-w-0">{buttons[0]}</div>
        <div className="min-w-0">{buttons[1]}</div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        <div className="min-w-0">{buttons[2]}</div>
        <div className="min-w-0">{buttons[3]}</div>
      </div>
    </div>
  );
}

export function DemoAnnotatorToolSection({ state }: { state: DemoAnnotatorState }) {
  const canEditTools = state.mode === "segmentation";
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);

  return (
    <DockSection title="Tool">
      {state.mode === "segmentation" ? (
        <DemoAnnotatorToolToolbar canEditTools={canEditTools} toolActions={toolActions} />
      ) : (
        <div className="flex min-h-[4.5rem] items-center justify-center text-muted-foreground text-xs">
          Classification
        </div>
      )}
    </DockSection>
  );
}

export function DemoInlineAnnotatorToolbar({ state }: { state: DemoAnnotatorState }) {
  const canEditTools = state.mode === "segmentation";
  const toolActions = buildAnnotationToolActions(state.tool, state.setTool, !canEditTools);

  return (
    <div className="shrink-0 border-t border-border px-3 py-2">
      {state.mode === "segmentation" ? (
        <DemoAnnotatorToolToolbar
          canEditTools={canEditTools}
          className="mx-auto flex w-full max-w-md flex-col gap-2"
          shortcutsEnabled={false}
          toolActions={toolActions}
        />
      ) : (
        <div className="flex min-h-[4.5rem] items-center justify-center text-muted-foreground text-xs">
          Classification
        </div>
      )}
    </div>
  );
}

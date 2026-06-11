import { Button } from "@lisca/ui/components";
import {
  ANNOTATION_TOOL_DEFINITIONS,
  type AnnotationTool,
} from "@lisca/ui-headless/annotation-tools";
import {
  dockToolLabel,
  dockToolShortcuts,
  useKeyboardShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";

export function buildAnnotationToolActions(
  tool: AnnotationTool,
  onToolChange: (tool: AnnotationTool) => void,
  disabled: boolean,
  options?: { disableTool?: (tool: AnnotationTool) => boolean },
): DockToolAction[] {
  return ANNOTATION_TOOL_DEFINITIONS.map(({ id, label }) => ({
    id,
    label,
    disabled: disabled || (options?.disableTool?.(id) ?? false),
    active: tool === id,
    onSelect: () => onToolChange(id),
  }));
}

export function AnnotationToolGrid(props: {
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
      <div className="grid w-full grid-cols-2 gap-2">
        <div className="min-w-0">{buttons[4]}</div>
        <div className="min-w-0">{buttons[5]}</div>
      </div>
    </div>
  );
}

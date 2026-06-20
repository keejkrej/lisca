import { Button } from "@lisca/ui/components";
import {
  ANNOTATION_TOOL_DEFINITIONS,
  ANNOTATION_TOOL_GRID_ROWS,
  annotationToolFamily,
  type AnnotationTool,
  type AnnotationToolFamily,
} from "@lisca/ui-headless/annotation-tools";
import {
  dockToolLabel,
  dockToolShortcuts,
  useKeyboardShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";
import { Lasso, Paintbrush, Sparkles, type LucideIcon } from "lucide-react";

const annotationToolIcons: Record<AnnotationToolFamily, LucideIcon> = {
  brush: Paintbrush,
  lasso: Lasso,
  smart: Sparkles,
};

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

function AnnotationToolButton(props: { action: DockToolAction; label: string }) {
  const family = annotationToolFamily(props.action.id as AnnotationTool);
  const Icon = annotationToolIcons[family];

  return (
    <Button
      className="w-full min-w-0 justify-center gap-1.5 px-1.5"
      disabled={props.action.disabled}
      size="sm"
      title={props.label}
      type="button"
      variant={props.action.active ? "default" : "outline"}
      onClick={props.action.onSelect}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 truncate text-xs">{props.label}</span>
    </Button>
  );
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
    return <AnnotationToolButton key={action.id} action={action} label={label} />;
  });

  return (
    <div
      aria-label="Annotation tool"
      className={props.className ?? "flex w-full flex-col gap-2"}
      role="toolbar"
    >
      {ANNOTATION_TOOL_GRID_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="grid w-full grid-cols-3 gap-2">
          {row.map((buttonIndex) => (
            <div key={props.toolActions[buttonIndex]?.id ?? buttonIndex} className="min-w-0">
              {buttons[buttonIndex]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

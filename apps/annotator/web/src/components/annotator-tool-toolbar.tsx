import { Button } from "@lisca/ui/components";
import { dockToolLabel, useDockToolShortcuts, type DockToolAction } from "@lisca/ui/shell";

export function AnnotatorToolToolbar(props: {
  canEditTools: boolean;
  toolActions: DockToolAction[];
}) {
  useDockToolShortcuts(props.toolActions, { enabled: props.canEditTools });

  const buttons = props.toolActions.map((action, index) => {
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
    <div className="flex w-full flex-col gap-2">
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

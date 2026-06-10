import { Button } from "@lisca/ui/components";
import {
  DockSection,
  DockStrip,
  dockToolLabel,
  useDockToolShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";

export function StudioResultDock(props: {
  instruction: string;
  toolActions: DockToolAction[];
  shortcutsEnabled: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  onSave: () => void;
}) {
  useDockToolShortcuts(props.toolActions, { enabled: props.shortcutsEnabled });

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <p className="line-clamp-4 text-center text-sm leading-snug">{props.instruction}</p>
      </DockSection>
      <DockSection title="Tool">
        <div className="flex flex-col gap-2">
          {props.toolActions.map((action, index) => (
            <Button
              key={action.id}
              className="w-full justify-center"
              disabled={action.disabled}
              size="sm"
              type="button"
              variant={action.active ? "default" : "outline"}
              onClick={action.onSelect}
            >
              {dockToolLabel(action.label, index)}
            </Button>
          ))}
        </div>
      </DockSection>
      <DockSection title="Action">
        <div className="flex flex-col gap-2">
          <Button
            className="w-full justify-center"
            disabled={props.saveDisabled}
            size="sm"
            type="button"
            variant="outline"
            onClick={props.onSave}
          >
            {props.saveLabel}
          </Button>
        </div>
      </DockSection>
    </DockStrip>
  );
}

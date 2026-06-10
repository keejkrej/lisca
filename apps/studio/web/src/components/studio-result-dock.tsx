import { Button } from "@lisca/ui/components";
import {
  DockSection,
  DockStrip,
  dockToolLabel,
  useDockToolShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";

const actionButtonClass = "w-full max-w-48 justify-center";

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
    <DockStrip panels={3}>
      <DockSection title="Instruction">
        <p className="line-clamp-4 text-center text-sm leading-snug">{props.instruction}</p>
      </DockSection>
      <DockSection title="Tool">
        <div className="flex w-full flex-col gap-2">
          {props.toolActions.map((action, index) => (
            <Button
              key={action.id}
              className={actionButtonClass}
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
        <div className="flex w-full flex-col gap-2">
          <Button
            className={actionButtonClass}
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

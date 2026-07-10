import { Toggle } from "../../components/ui/toggle";
import { cn } from "../../lib/utils";

export type AlignEditToggleProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  class?: string;
};

export function AlignEditToggle(props: AlignEditToggleProps) {
  return (
    <Toggle
      aria-label="Edit site exclusions"
      aria-pressed={props.enabled}
      class={cn("w-full justify-center text-xs", props.class)}
      disabled={props.disabled}
      pressed={props.enabled}
      size="sm"
      variant="outline"
      onChange={props.onEnabledChange}
    >
      Edit
    </Toggle>
  );
}
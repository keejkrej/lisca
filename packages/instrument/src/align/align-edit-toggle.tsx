import { Toggle } from "@lisca/ui/toggle";
import { cn } from "@lisca/ui/cn";
import { AlignStateToggleIndicator } from "@lisca/ui/patterns";

export type AlignEditToggleProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  class?: string;
};

export function AlignEditToggle(props: AlignEditToggleProps) {
  return (
    <Toggle
      aria-label="Edit pattern exclusions"
      aria-pressed={props.enabled}
      class={cn("w-full justify-center text-xs", props.class)}
      data-instrument-state-toggle=""
      disabled={props.disabled}
      pressed={props.enabled}
      size="sm"
      variant="outline"
      onChange={props.onEnabledChange}
    >
      <AlignStateToggleIndicator pressed={props.enabled} />
      <span>Edit</span>
    </Toggle>
  );
}

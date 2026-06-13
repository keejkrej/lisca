import { Toggle } from "../../../components/ui/toggle";
import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";

export type AlignEditToggleProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function AlignEditToggle({
  className,
  disabled,
  enabled,
  onEnabledChange,
}: AlignEditToggleProps) {
  return (
    <Toggle
      accessibilityLabel="Edit site exclusions"
      accessibilityState={{ selected: enabled }}
      className={cn("w-full justify-center", className)}
      disabled={disabled}
      pressed={enabled}
      size="sm"
      variant="outline"
      onPressedChange={onEnabledChange}
    >
      <Text className="text-xs">Edit</Text>
    </Toggle>
  );
}

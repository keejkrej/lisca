"use client";

import { Toggle } from "../../components/ui/toggle";
import { cn } from "../../lib/utils";

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
      aria-label="Edit site exclusions"
      aria-pressed={enabled}
      className={cn("w-full justify-center text-xs", className)}
      disabled={disabled}
      pressed={enabled}
      size="sm"
      variant="outline"
      onPressedChange={onEnabledChange}
    >
      Edit
    </Toggle>
  );
}

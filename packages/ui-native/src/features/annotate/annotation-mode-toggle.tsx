import type { AnnotationMode } from "@lisca/ui-headless";

import { Text } from "../../../components/ui/text";
import { ToggleGroup, ToggleGroupItem } from "../../../components/ui/toggle-group";
import { cn } from "../../../lib/utils";

const MODE_OPTIONS = [
  { value: "classification", label: "Classification" },
  { value: "segmentation", label: "Segmentation" },
] as const;

export function AnnotationModeToggle(props: {
  mode: AnnotationMode;
  onModeChange: (mode: AnnotationMode) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <ToggleGroup
      className={cn("w-full min-w-0", props.className)}
      disabled={props.disabled}
      type="single"
      size="sm"
      value={props.mode}
      variant="outline"
      onValueChange={(value) => {
        if (value === "classification" || value === "segmentation") {
          props.onModeChange(value);
        }
      }}
    >
      {MODE_OPTIONS.map((option, index) => (
        <ToggleGroupItem
          key={option.value}
          className="min-w-0 flex-1 px-2 text-xs"
          isFirst={index === 0}
          isLast={index === MODE_OPTIONS.length - 1}
          value={option.value}
        >
          <Text className="text-xs">{option.label}</Text>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

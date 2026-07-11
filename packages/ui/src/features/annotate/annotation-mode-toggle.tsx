import type { AnnotationMode } from "@lisca/ui-headless";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";
import { cn } from "../../lib/utils";

export function AnnotationModeToggle(props: {
  mode: AnnotationMode;
  onModeChange: (mode: AnnotationMode) => void;
  class?: string;
}) {
  return (
    <ToggleGroup
      class={cn("w-full min-w-0", props.class)}
      size="sm"
      value={props.mode}
      variant="outline"
      onChange={(next) => {
        const value = typeof next === "string" ? next : next?.[0];
        if (value === "classification" || value === "segmentation") props.onModeChange(value);
      }}
    >
      <ToggleGroupItem value="classification" class="min-w-0 flex-1 px-2 text-xs">
        Classification
      </ToggleGroupItem>
      <ToggleGroupItem value="segmentation" class="min-w-0 flex-1 px-2 text-xs">
        Segmentation
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
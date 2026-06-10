import type { AnnotationMode } from "@lisca/ui-headless";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";
import { cn } from "../../lib/utils";

export function AnnotationModeToggle({
  mode,
  onModeChange,
  className,
}: {
  mode: AnnotationMode;
  onModeChange: (mode: AnnotationMode) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      className={cn("w-full min-w-0", className)}
      multiple={false}
      size="sm"
      value={[mode]}
      variant="outline"
      onValueChange={(next) => {
        const value = next[0];
        if (value === "classification" || value === "segmentation") onModeChange(value);
      }}
    >
      <ToggleGroupItem value="classification" className="min-w-0 flex-1 px-2 text-xs">
        Classification
      </ToggleGroupItem>
      <ToggleGroupItem value="segmentation" className="min-w-0 flex-1 px-2 text-xs">
        Segmentation
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

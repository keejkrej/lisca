import type { Html } from "@effect/ui/html";
import type { AnnotationMode } from "@lisca/ui-headless/types";
import { cn } from "@lisca/ui/cn";
import { ToggleGroup } from "@lisca/ui/toggle-group";

export type AnnotationModeToggleOptions<M> = {
  readonly key?: string | undefined;
  readonly mode: AnnotationMode;
  readonly onModeChange: (mode: AnnotationMode) => M;
  readonly class?: string | undefined;
};

export type AnnotationModeToggleProps<M = never> = AnnotationModeToggleOptions<M>;

export function AnnotationModeToggle<M>(h: Html.H<M>, options: AnnotationModeToggleOptions<M>) {
  return ToggleGroup(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    class: cn("w-full min-w-0", options.class),
    size: "sm",
    variant: "outline",
    value: [options.mode],
    items: [
      { value: "classification", class: "min-w-0 flex-1 px-2 text-xs", content: "Classification" },
      { value: "segmentation", class: "min-w-0 flex-1 px-2 text-xs", content: "Segmentation" },
    ],
    onChange: (next) => {
      const value = next[0];
      if (value === "classification" || value === "segmentation") {
        return options.onModeChange(value);
      }
      return undefined;
    },
  });
}

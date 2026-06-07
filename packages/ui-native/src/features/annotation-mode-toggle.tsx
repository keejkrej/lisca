import type { AnnotationMode } from "@lisca/contracts";

import { SegmentedToggle } from "../shell/buttons.tsx";

const MODE_OPTIONS = [
  { value: "classification", label: "Classification" },
  { value: "segmentation", label: "Segmentation" },
] as const;

export function AnnotationModeToggle(props: {
  mode: AnnotationMode;
  onModeChange: (mode: AnnotationMode) => void;
  disabled?: boolean;
}) {
  return (
    <SegmentedToggle
      disabled={props.disabled}
      options={MODE_OPTIONS}
      value={props.mode}
      onChange={(value) => {
        if (value === "classification" || value === "segmentation") {
          props.onModeChange(value);
        }
      }}
    />
  );
}

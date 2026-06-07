import type { AnnotationLabel } from "@lisca/contracts";
import { hexToRgb } from "@lisca/utils";

export function labelColorStyle(label: AnnotationLabel, selected: boolean) {
  const rgb = hexToRgb(label.color);
  if (!rgb) return undefined;
  return {
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${selected ? 0.95 : 0.35})`,
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${selected ? 0.18 : 0.1})`,
    color: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
  };
}

import type { AnnotationLabel } from "@lisca/contracts";
import { labelColorStyle as labelColorStyleImpl } from "@lisca/utils";

export function labelColorStyle(label: AnnotationLabel, selected: boolean) {
  return labelColorStyleImpl(label, selected);
}
